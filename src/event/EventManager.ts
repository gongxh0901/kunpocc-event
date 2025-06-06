/**
 * @Author: Gongxh
 * @Date: 2024-12-21
 * @Description: 
 */

import { CommandManager, CommandType } from "./Command";
import { Event } from "./Event";
import { EventFactory } from "./EventFactory";

export class EventManager {
    /** 
     * 发送事件是否正在执行中
     * 执行中不允许添加和移除事件
     * @internal
     */
    private isSending: boolean = false;

    /** 
     * 注册的所有事件 事件ID -> 事件
     * @internal
     */
    private events: Map<number, Event> = new Map<number, Event>();

    /** 
     * 事件名称 -> 事件ID集合
     * @internal
     */
    private nameToIds: Map<string, Set<number>> = new Map<string, Set<number>>();

    /** 
     * 事件目标 -> 事件ID集合
     * @internal
     */
    private targetToIds: Map<any, Set<number>> = new Map<any, Set<number>>();

    /** 
     * 事件工厂
     * @internal
     */
    private factory: EventFactory = new EventFactory(64, Event);

    /** 
     * 命令管理器
     * @internal
     */
    private commandManager: CommandManager = new CommandManager();

    /**
     * @internal
     */
    private needRemoveIds: number[] = [];

    /**
     * @internal
     */
    private triggerList: Event[] = [];

    /**
     * 添加事件监听器。
     * @param name - 事件名称。
     * @param callback - 回调函数，当事件触发时执行。
     * @param target - 可选参数，指定事件监听的目标对象。
     * 该方法将事件和回调函数注册到事件管理器中，以便在事件触发时执行相应的回调函数。
     * 
     * @returns 返回事件ID，可用于移除事件
     */
    public add(name: string, callback: (...args: any[]) => void, target?: any): number {
        if (!name) {
            throw new Error("事件名称不能为空");
        }
        if (!callback) {
            throw new Error("回调函数不能为空");
        }
        let event = this.factory.allocate<Event>();
        event.name = name;
        event.callback = callback;
        event.target = target;
        event.once = false;

        if (this.isSending) {
            this.commandManager.addEvent(event);
            return event.id;
        }
        this.addEvent(event);
        return event.id;
    }

    /**
     * 添加一个只触发一次的事件监听器。
     * @param name - 事件名称。
     * @param callback - 事件触发时要执行的回调函数。
     * @param target - 可选参数，指定事件监听器的目标对象。
     * 
     * @returns 返回事件ID，可用于移除事件
     */
    public addOnce(name: string, callback: (...args: any[]) => void, target?: any): number {
        if (!name) {
            throw new Error("事件名称不能为空");
        }
        if (!callback) {
            throw new Error("回调函数不能为空");
        }
        let event = this.factory.allocate<Event>();
        event.name = name;
        event.callback = callback;
        event.target = target;
        event.once = true;

        if (this.isSending) {
            this.commandManager.addEvent(event);
            return event.id;
        }
        this.addEvent(event);
        return event.id;
    }

    /** 
     * 添加事件 内部方法
     * @param name 事件名称
     * @param callback 回调函数
     * @param once 是否只触发一次
     * @param target 目标对象
     * @returns 返回事件ID，可用于移除事件
     * 
     * @internal
     */
    private addEvent(event: Event): void {
        this.events.set(event.id, event);

        if (!this.nameToIds.has(event.name)) {
            this.nameToIds.set(event.name, new Set<number>());
        }

        const ids = this.nameToIds.get(event.name);
        ids.add(event.id);

        let target = event.target;
        if (target) {
            if (!this.targetToIds.has(target)) {
                this.targetToIds.set(target, new Set<number>());
            }
            this.targetToIds.get(target).add(event.id);
        }
    }

    /**
     * 发送事件给所有注册的监听器。
     * @param name - 事件名称。
     * @param target - 可选参数，指定目标对象，只有目标对象匹配时才会触发监听器。 (制定目标对象 效率更高)
     * @param args - 传递给监听器回调函数的参数。
     */
    public send(name: string, target?: any, ...args: any[]): void {
        if (!this.nameToIds.has(name)) {
            return;
        }
        const eventIds = this.nameToIds.get(name);
        if (eventIds.size == 0) {
            return;
        }

        this.isSending = true;
        this.needRemoveIds.length = 0;
        this.triggerList.length = 0;

        for (const eventId of eventIds.values()) {
            if (!this.events.has(eventId)) {
                this.needRemoveIds.push(eventId);
                continue;
            }
            let event = this.events.get(eventId);
            if (!target || target == event.target) {
                this.triggerList.push(event);
                if (event.once) {
                    this.needRemoveIds.push(eventId);
                }
            }
        }
        // 真正触发事件
        for (const event of this.triggerList) {
            event.callback(...args);
        }
        this.isSending = false;

        // 移除事件
        if (this.needRemoveIds.length > 0) {
            for (const id of this.needRemoveIds) {
                this.remove(id);
            }
            this.needRemoveIds.length = 0;
        }

        this.commandManager.forEach(command => {
            switch (command.type) {
                case CommandType.Add:
                    this.addEvent(command.event);
                    break;
                case CommandType.RemoveById:
                    this.remove(command.eventId);
                    break;
                case CommandType.RemoveByName:
                    this.removeByName(command.name);
                    break;
                case CommandType.RemoveByTarget:
                    this.removeByTarget(command.target);
                    break;
                case CommandType.RemoveByNameAndTarget:
                    this.removeByNameAndTarget(command.name, command.target);
                    break;
                case CommandType.ClearAll:
                    this.clearAll();
                    break;
            }
        });
    }

    /** 
     * 通过事件ID移除事件
     * @param eventId 事件ID
     */
    public remove(eventId: number): void {
        if (!this.events.has(eventId)) {
            return;
        }
        if (this.isSending) {
            this.commandManager.add(CommandType.RemoveById, eventId, null, null);
            return;
        }
        let event = this.events.get(eventId);
        let name = event.name;
        let target = event.target;

        this.events.delete(eventId);
        this.factory.recycle(event);

        if (this.nameToIds.has(name)) {
            this.nameToIds.get(name).delete(eventId);
        }
        if (target && this.targetToIds.has(target)) {
            this.targetToIds.get(target).delete(eventId);
        }
    }

    /**
     * 移除指定名称的所有事件
     * @param name 事件名称
     */
    public removeByName(name: string): void {
        if (!this.nameToIds.has(name)) {
            return;
        }
        let eventIds = this.nameToIds.get(name);
        if (eventIds.size == 0) {
            return;
        }

        if (this.isSending) {
            this.commandManager.add(CommandType.RemoveByName, null, name, null);
            return;
        }
        eventIds.forEach(eventId => {
            if (this.events.has(eventId)) {
                let event = this.events.get(eventId);
                if (event.target && this.targetToIds.has(event.target)) {
                    this.targetToIds.get(event.target).delete(eventId);
                }
                this.events.delete(eventId);
                this.factory.recycle(event);
            }
        });
        this.nameToIds.delete(name);
    }

    /**
     * 移除指定目标的所有事件
     * @param target 目标对象
     */
    public removeByTarget(target: any): void {
        if (!this.targetToIds.has(target)) {
            return;
        }
        let eventIds = this.targetToIds.get(target);
        if (eventIds.size == 0) {
            return;
        }
        if (this.isSending) {
            this.commandManager.add(CommandType.RemoveByTarget, null, null, target);
            return;
        }

        eventIds.forEach(eventId => {
            if (this.events.has(eventId)) {
                let event = this.events.get(eventId);
                if (this.nameToIds.has(event.name)) {
                    this.nameToIds.get(event.name).delete(eventId);
                }
                this.events.delete(eventId);
                this.factory.recycle(event);
            }
        });
        this.targetToIds.delete(target)
    }

    /**
     * 移除指定名称和指定目标的事件
     * @param name 事件名称
     * @param target 绑定的目标对象
     */
    public removeByNameAndTarget(name: string, target: any): void {
        if (!this.nameToIds.has(name)) {
            return;
        }
        let nameIds = this.nameToIds.get(name);
        let targetIds = this.targetToIds.get(target);
        if (nameIds.size == 0 || targetIds.size == 0) {
            return;
        }
        if (this.isSending) {
            this.commandManager.add(CommandType.RemoveByNameAndTarget, null, name, target);
            return;
        }

        this.needRemoveIds.length = 0;
        if (nameIds.size < targetIds.size) {
            nameIds.forEach(eventId => {
                let event = this.events.get(eventId);
                if (event.target == target) {
                    this.needRemoveIds.push(eventId);
                }
            });
        } else {
            targetIds.forEach(eventId => {
                let event = this.events.get(eventId);
                if (event.name == name) {
                    this.needRemoveIds.push(eventId);
                }
            });
        }
        if (this.needRemoveIds.length > 0) {
            for (const id of this.needRemoveIds) {
                this.remove(id);
            }
            this.needRemoveIds.length = 0;
        }
    }

    /**
     * 清空所有注册的事件
     */
    public clearAll(): void {
        if (this.isSending) {
            this.commandManager.add(CommandType.ClearAll, null, null, null);
            return;
        }
        for (const event of this.events.values()) {
            this.factory.recycle(event);
        }
        this.events.clear();
        this.nameToIds.clear();
        this.targetToIds.clear();
        this.commandManager.clear();
    }
}