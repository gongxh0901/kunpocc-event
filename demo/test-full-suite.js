/**
 * @Author: Linus Torvalds (测试审查者)
 * @Description: 完整测试套件 - 覆盖所有关键场景和已知bug
 * 
 * "Show me the tests, and I'll know if the code is good."
 * 
 * 测试哲学：
 * 1. 测试真实场景，不测试不存在的问题
 * 2. 每个测试独立，失败时能精确定位问题
 * 3. 简单直接，零废话
 */

const { EventManager } = require('kunpocc-event');

// 测试统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 测试辅助函数
function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`✅ ${name}`);
        return true;
    } catch (e) {
        failedTests++;
        console.log(`❌ ${name}`);
        console.log(`   错误: ${e.message}`);
        if (e.expected !== undefined) {
            console.log(`   期望: ${e.expected}`);
            console.log(`   实际: ${e.actual}`);
        }
        return false;
    }
}

function assert(condition, message, expected, actual) {
    if (!condition) {
        const error = new Error(message);
        error.expected = expected;
        error.actual = actual;
        throw error;
    }
}

function assertEquals(actual, expected, message) {
    assert(
        actual === expected,
        message || `值不相等`,
        expected,
        actual
    );
}

console.log('========================================');
console.log('EventManager 完整测试套件');
console.log('========================================\n');

// ============================================
// 第一部分：基础功能测试
// ============================================
console.log('【第一部分】基础功能测试\n');

test('基本事件添加和触发', () => {
    const em = new EventManager();
    let called = false;
    em.add('test', () => { called = true; });
    em.send('test');
    assert(called, '事件应该被触发', true, called);
});

test('事件回调接收参数', () => {
    const em = new EventManager();
    let receivedArgs = null;
    em.add('test', (...args) => { receivedArgs = args; });
    em.send('test', null, 1, 2, 3);
    assert(receivedArgs !== null, '应该接收到参数', 'not null', 'null');
    assertEquals(receivedArgs.length, 3, '参数个数应该是3');
    assertEquals(receivedArgs[0], 1, '第一个参数应该是1');
});

test('once 事件只触发一次', () => {
    const em = new EventManager();
    let count = 0;
    em.addOnce('test', () => { count++; });
    em.send('test');
    em.send('test');
    assertEquals(count, 1, 'once事件应该只触发1次');
});

test('多个监听器按顺序触发', () => {
    const em = new EventManager();
    const order = [];
    em.add('test', () => { order.push(1); });
    em.add('test', () => { order.push(2); });
    em.add('test', () => { order.push(3); });
    em.send('test');
    assertEquals(order.join(','), '1,2,3', '监听器应该按注册顺序触发');
});

test('通过ID删除事件', () => {
    const em = new EventManager();
    let called = false;
    const id = em.add('test', () => { called = true; });
    em.remove(id);
    em.send('test');
    assert(!called, '删除后事件不应该被触发', false, called);
});

test('通过名称删除所有事件', () => {
    const em = new EventManager();
    let count = 0;
    em.add('test', () => { count++; });
    em.add('test', () => { count++; });
    em.removeByName('test');
    em.send('test');
    assertEquals(count, 0, '删除后不应该有事件触发');
});

test('通过target删除事件', () => {
    const em = new EventManager();
    const target = { id: 1 };
    let count = 0;
    em.add('test1', () => { count++; }, target);
    em.add('test2', () => { count++; }, target);
    em.add('test3', () => { count++; });  // 没有target
    em.removeByTarget(target);
    em.send('test1');
    em.send('test2');
    em.send('test3');
    assertEquals(count, 1, '只有test3应该被触发');
});

test('通过名称和target删除事件', () => {
    const em = new EventManager();
    const target1 = { id: 1 };
    const target2 = { id: 2 };
    let count = 0;
    em.add('test', () => { count++; }, target1);
    em.add('test', () => { count++; }, target2);
    em.removeByNameAndTarget('test', target1);
    em.send('test');
    assertEquals(count, 1, '只有target2的监听器应该被触发');
});

test('clearAll 清空所有事件', () => {
    const em = new EventManager();
    let count = 0;
    em.add('test1', () => { count++; });
    em.add('test2', () => { count++; });
    em.clearAll();
    em.send('test1');
    em.send('test2');
    assertEquals(count, 0, 'clearAll后不应该有事件触发');
});

// ============================================
// 第二部分：边界情况和错误处理
// ============================================
console.log('\n【第二部分】边界情况和错误处理\n');

test('触发不存在的事件不崩溃', () => {
    const em = new EventManager();
    em.send('nonexistent');  // 不应该崩溃
});

test('删除不存在的事件ID不崩溃', () => {
    const em = new EventManager();
    em.remove(999);  // 不应该崩溃
});

test('删除不存在的事件名不崩溃', () => {
    const em = new EventManager();
    em.removeByName('nonexistent');  // 不应该崩溃
});

test('删除不存在的target不崩溃', () => {
    const em = new EventManager();
    em.removeByTarget({ id: 999 });  // 不应该崩溃
});

test('空事件名抛出错误', () => {
    const em = new EventManager();
    let threw = false;
    try {
        em.add('', () => {});
    } catch (e) {
        threw = true;
    }
    assert(threw, '空事件名应该抛出错误', true, threw);
});

test('空回调函数抛出错误', () => {
    const em = new EventManager();
    let threw = false;
    try {
        em.add('test', null);
    } catch (e) {
        threw = true;
    }
    assert(threw, '空回调应该抛出错误', true, threw);
});

test('removeByNameAndTarget 处理不存在的target (Bug #2回归测试)', () => {
    const em = new EventManager();
    em.add('test', () => {});  // 没有target
    // 不应该崩溃
    em.removeByNameAndTarget('test', { id: 'nonexistent' });
});

// ============================================
// 第三部分：嵌套和递归测试
// ============================================
console.log('\n【第三部分】嵌套和递归测试\n');

test('嵌套事件触发：所有监听器都应该被调用', () => {
    const em = new EventManager();
    let aCount = 0, bCount = 0, event2Count = 0;
    
    em.add('event1', () => {
        aCount++;
        em.send('event2');  // 嵌套触发
    });
    em.add('event1', () => { bCount++; });
    em.add('event2', () => { event2Count++; });
    
    em.send('event1');
    
    assertEquals(aCount, 1, 'A应该被触发1次');
    assertEquals(bCount, 1, 'B应该被触发1次 (嵌套事件不应该打断)');
    assertEquals(event2Count, 1, 'event2应该被触发1次');
});

test('深层嵌套事件 (3层)', () => {
    const em = new EventManager();
    const order = [];
    
    em.add('e1', () => { 
        order.push('e1-1');
        em.send('e2');
        order.push('e1-1-end');
    });
    em.add('e1', () => { order.push('e1-2'); });
    
    em.add('e2', () => { 
        order.push('e2-1');
        em.send('e3');
        order.push('e2-1-end');
    });
    em.add('e2', () => { order.push('e2-2'); });
    
    em.add('e3', () => { order.push('e3'); });
    
    em.send('e1');
    
    const expected = 'e1-1,e2-1,e3,e2-1-end,e2-2,e1-1-end,e1-2';
    assertEquals(order.join(','), expected, '深层嵌套执行顺序应该正确');
});

test('在回调中添加新监听器（命令队列测试）', () => {
    const em = new EventManager();
    let dynamicCount = 0;
    
    em.add('test', () => {
        // 在事件触发期间添加新监听器
        em.add('test', () => { dynamicCount++; });
    });
    
    em.send('test');  // 第一次：动态添加监听器
    assertEquals(dynamicCount, 0, '动态添加的监听器本次不应该触发');
    
    em.send('test');  // 第二次：动态监听器应该触发
    assertEquals(dynamicCount, 1, '动态添加的监听器第二次应该触发');
});

test('在回调中删除其他监听器（命令队列测试）', () => {
    const em = new EventManager();
    let count = 0;
    
    const id2 = em.add('test', () => { count++; });
    em.add('test', () => {
        em.remove(id2);  // 在触发期间删除另一个监听器
        count += 10;
    });
    
    em.send('test');
    assert(count > 0, '至少有一个监听器应该触发', true, count > 0);
});

test('递归深度限制保护', () => {
    const em = new EventManager();
    let depth = 0;
    
    em.add('recursive', () => {
        depth++;
        if (depth < 30) {  // 尝试递归30次
            em.send('recursive');
        }
    });
    
    em.send('recursive');
    
    // 应该被限制在20次左右（MAX_RECURSION_DEPTH = 20）
    assert(depth <= 22, '递归深度应该被限制', '<=22', depth);
});

// ============================================
// 第四部分：Bug回归测试
// ============================================
console.log('\n【第四部分】Bug回归测试\n');

test('Bug #1回归: 事件ID不应该重用', () => {
    const em = new EventManager();
    
    // 添加once事件
    const id1 = em.addOnce('e1', () => {});
    em.send('e1');  // 触发并删除
    
    // 添加新事件
    const id2 = em.add('e2', () => {});
    
    // ID不应该相同
    assert(id1 !== id2, 'ID不应该重用', 'id1 !== id2', `${id1} === ${id2}`);
});

test('Bug #1回归: 删除旧ID不应该影响新事件', () => {
    const em = new EventManager();
    let newEventCalled = false;
    
    const oldId = em.addOnce('old', () => {});
    em.send('old');  // 触发并删除
    
    const newId = em.add('new', () => { newEventCalled = true; });
    
    // 尝试删除旧ID（不应该影响新事件）
    em.remove(oldId);
    em.send('new');
    
    assert(newEventCalled, '新事件应该正常触发', true, newEventCalled);
});

test('Bug #2回归: removeByNameAndTarget 不应该NPE', () => {
    const em = new EventManager();
    
    // 添加没有target的事件
    em.add('test', () => {});
    
    // 尝试用不存在的target删除，不应该崩溃
    let crashed = false;
    try {
        em.removeByNameAndTarget('test', { nonexistent: true });
    } catch (e) {
        crashed = true;
    }
    
    assert(!crashed, 'removeByNameAndTarget不应该崩溃', false, crashed);
});

// ============================================
// 第五部分：对象池测试
// ============================================
console.log('\n【第五部分】对象池测试\n');

test('对象池：大量添加删除不应该内存泄漏', () => {
    const em = new EventManager();
    const iterations = 1000;
    
    for (let i = 0; i < iterations; i++) {
        const id = em.add(`event${i}`, () => {});
        em.remove(id);
    }
    
    // 如果没崩溃，就算通过
});

test('对象池：once事件大量触发', () => {
    const em = new EventManager();
    let count = 0;
    const iterations = 100;
    
    for (let i = 0; i < iterations; i++) {
        em.addOnce(`event${i}`, () => { count++; });
        em.send(`event${i}`);
    }
    
    assertEquals(count, iterations, `应该触发${iterations}次`);
});

// ============================================
// 第六部分：target相关测试
// ============================================
console.log('\n【第六部分】target过滤测试\n');

test('send with target 只触发匹配的监听器', () => {
    const em = new EventManager();
    const target1 = { id: 1 };
    const target2 = { id: 2 };
    let count1 = 0, count2 = 0, count3 = 0;
    
    em.add('test', () => { count1++; }, target1);
    em.add('test', () => { count2++; }, target2);
    em.add('test', () => { count3++; });  // 无target
    
    em.send('test', target1);
    
    assertEquals(count1, 1, 'target1的监听器应该触发');
    assertEquals(count2, 0, 'target2的监听器不应该触发');
    assertEquals(count3, 0, '无target的监听器在指定target时不应该触发');
});

test('send without target 触发所有监听器', () => {
    const em = new EventManager();
    const target1 = { id: 1 };
    let count1 = 0, count2 = 0;
    
    em.add('test', () => { count1++; }, target1);
    em.add('test', () => { count2++; });
    
    em.send('test');  // 不指定target
    
    assertEquals(count1, 1, 'target1的监听器应该触发');
    assertEquals(count2, 1, '无target的监听器应该触发');
});

// ============================================
// 第七部分：性能基准测试
// ============================================
console.log('\n【第七部分】性能基准测试\n');

test('性能: 100万次事件触发', () => {
    const em = new EventManager();
    let count = 0;
    em.add('perf', () => { count++; });
    
    const iterations = 1000000;
    const start = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        em.send('perf');
    }
    
    const duration = Date.now() - start;
    const throughput = Math.floor(iterations / duration * 1000);
    
    console.log(`   性能: ${throughput.toLocaleString()} 次/秒 (${duration}ms)`);
    
    // 性能应该 > 50万次/秒
    assert(throughput > 500000, '性能应该足够快', '>500k/s', `${throughput}/s`);
});

// ============================================
// 测试总结
// ============================================
console.log('\n========================================');
console.log('测试总结');
console.log('========================================');
console.log(`总测试数: ${totalTests}`);
console.log(`通过: ${passedTests} ✅`);
console.log(`失败: ${failedTests} ❌`);
console.log(`成功率: ${(passedTests / totalTests * 100).toFixed(1)}%`);

if (failedTests === 0) {
    console.log('\n🎉 所有测试通过！');
    console.log('\n【Linus式评价】');
    console.log('"Talk is cheap. Show me the code."');
    console.log('代码通过了测试。这是最低要求。');
    console.log('现在可以发布了。');
    process.exit(0);
} else {
    console.log('\n💥 有测试失败！');
    console.log('修复后再发布。');
    process.exit(1);
}

