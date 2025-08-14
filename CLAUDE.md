# Claude 配置文件

## 信息过滤规则

### 上下文优化
- 忽略 node_modules 目录中的所有文件
- 忽略 dist 和 build 目录中的构建产物
- 忽略 .git 目录中的版本控制信息
- 优先关注 src 目录中的源代码文件
- 在代码分析时，重点关注 TypeScript 文件 (.ts)

### 文件类型优先级
1. **高优先级**: TypeScript 源文件 (src/*.ts)
2. **中优先级**: 配置文件 (package.json, tsconfig.json, rollup.config.mjs)
3. **低优先级**: 文档文件 (README.md, CHANGELOG.md)

## 命名规范

### 类和类型命名
- **类名**（含枚举、装饰器类）使用大驼峰（PascalCase）
  ```typescript
  class PetTrainerService {}
  enum RewardType {}
  class MyDecorator {}
  ```

### 函数和方法命名
- **公有函数/方法名**使用小驼峰（camelCase），不加下划线前缀
  ```typescript
  public getRewardList() {}
  export function buildConfig() {}
  ```

- **私有函数/方法名**使用"下划线 + 小驼峰"
  ```typescript
  private _loadConfig() {}
  private _applyBonus() {}
  ```

### 属性命名
- **公有属性**使用小驼峰（camelCase）
  ```typescript
  public totalScore: number;
  ```

- **私有属性**使用蛇形命名（snake_case）
  ```typescript
  private max_count: number;
  private user_id_map: Map<string, User>;
  ```

### 常量命名
- **常量**使用全大写下划线（UPPER_SNAKE_CASE）
  ```typescript
  const MAX_COUNT = 10;
  const DEFAULT_TIMEOUT = 5000;
  ```

## 代码风格与可读性

### 控制流程
- 优先使用早返回（early return），避免三层以上深度嵌套
- 复杂逻辑拆分为小而清晰的私有函数（按上述命名规则）

### 文档注释
- 导出的 API/类必须具备简洁的中文文档注释
- 注释重点解释"为什么/约束/边界"，而非"是什么"
- 示例：
  ```typescript
  /**
   * 事件管理器 - 负责统一管理和分发应用内事件
   * 
   * 约束：
   * - 最多支持 1000 个并发监听器
   * - 事件名称不能包含特殊字符
   */
  export class EventManager {}
  ```

### 代码质量
- 禁止引入与项目风格冲突的实验性写法
- 保持现有格式化风格，不进行无关重构
- 遵循现有的 TypeScript 配置和 lint 规则

## 测试与构建

### 构建命令
```bash
npm run build
```

### 清理命令
```bash
npm run clean
```

### 可用脚本
- `clean`: 清理 dist 目录
- `build`: 清理并使用 rollup 构建项目