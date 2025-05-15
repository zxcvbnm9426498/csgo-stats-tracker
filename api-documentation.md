# CSGO数据统计查询系统 API文档

本文档详细说明了CSGO数据统计查询系统所有API接口的使用方法。

## 目录

- [公共API](#公共api)
  - [查询玩家数据](#查询玩家数据)
  - [获取账号列表](#获取账号列表)
  - [初始化数据库](#初始化数据库)
- [认证相关API](#认证相关api)
  - [用户登录](#用户登录)
  - [检查封禁状态](#检查封禁状态)
  - [获取ELO分数](#获取elo分数)
- [管理员API](#管理员api)
  - [管理员认证](#管理员认证)
  - [账号管理](#账号管理)
  - [日志管理](#日志管理)
  - [测试数据库连接](#测试数据库连接)

## 公共API

### 查询玩家数据

通过Steam ID或用户ID查询CSGO玩家数据。

**URL**: `/api/csgo`

**方法**: `POST`

**权限**: 公开，无需认证

**请求参数**:

```json
{
  "searchType": "steamId | userId",
  "searchId": "要查询的ID"
}
```

**请求头**:

- `x-auth-token` (可选): 登录后的认证令牌，提供后可获取更多数据

**成功响应**:

```json
{
  "playerInfo": {
    "steamId64Str": "765611XXXXXXXXXX",
    "name": "玩家名称"
  },
  "userInfo": {
    "code": 1,
    "data": {
      "player": {
        "personaname": "玩家名称"
      },
      "vac_banned": false,
      "game_ban_count": 0
    },
    "banInfo": {
      "desc": "无封禁"
    }
  },
  "playerStats": {
    "code": 0,
    "data": {
      "pvpScore": 1500,
      "matchList": [...]
    }
  },
  "detailedStats": {
    "player_name": "玩家名称",
    "main_stats": {...},
    "detailed_stats": {...},
    "weapons": [...],
    "maps": [...]
  }
}
```

**错误响应**:

```json
{
  "error": "Failed to find player data"
}
```

### 获取账号列表

获取系统中所有公开账号的列表。

**URL**: `/api/public/accounts`

**方法**: `GET`

**权限**: 公开，无需认证

**成功响应**:

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "1",
        "username": "用户名",
        "userId": "用户ID",
        "steamId": "Steam ID",
        "status": "active"
      }
    ]
  }
}
```

### 初始化数据库

初始化系统数据库，创建必要的表结构。

**URL**: `/api/init-db`

**方法**: `GET`

**权限**: 公开，但通常只在系统初始启动时调用

**成功响应**:

```json
{
  "success": true,
  "message": "数据库初始化成功"
}
```

## 认证相关API

### 用户登录

用户使用完美世界账号登录系统。

**URL**: `/api/auth`

**方法**: `POST`

**权限**: 公开，无需认证

**请求参数**:

```json
{
  "action": "login",
  "mobilePhone": "手机号",
  "securityCode": "验证码"
}
```

**成功响应**:

```json
{
  "code": 0,
  "description": "Success",
  "result": {
    "loginResult": {
      "accountInfo": {
        "token": "认证令牌",
        "userId": "用户ID",
        "mobilePhone": "手机号"
      }
    }
  }
}
```

### 检查封禁状态

检查玩家的封禁状态。

**URL**: `/api/auth`

**方法**: `POST`

**权限**: 需要认证

**请求头**:

- `x-auth-token`: 登录后的认证令牌

**请求参数**:

```json
{
  "action": "checkBan",
  "steamId": "要查询的Steam ID"
}
```

**成功响应**:

```json
{
  "statusCode": 0,
  "data": {
    "desc": "封禁状态描述",
    "expireTime": 1718999999
  }
}
```

### 获取ELO分数

获取玩家的ELO分数和最近比赛记录。

**URL**: `/api/auth`

**方法**: `POST`

**权限**: 需要认证

**请求头**:

- `x-auth-token`: 登录后的认证令牌

**请求参数**:

```json
{
  "action": "getEloScore",
  "steamId": "要查询的Steam ID"
}
```

**成功响应**:

```json
{
  "statusCode": 0,
  "data": {
    "pvpScore": 1500,
    "matchList": [
      {
        "matchId": "比赛ID",
        "mapName": "地图名称",
        "score1": 16,
        "score2": 14,
        "startTime": "1718999999",
        "pvpScore": 1500,
        "pvpScoreChange": 25
      }
    ]
  }
}
```

## 管理员API

### 管理员认证

管理员登录系统。

**URL**: `/api/admin/auth`

**方法**: `POST`

**权限**: 公开，无需认证

**请求参数**:

```json
{
  "action": "login",
  "username": "管理员用户名",
  "password": "密码"
}
```

**成功响应**:

```json
{
  "success": true,
  "message": "登录成功",
  "admin": {
    "id": "管理员ID",
    "username": "管理员用户名",
    "role": "admin"
  }
}
```

### 账号管理

#### 获取账号列表

**URL**: `/api/admin/accounts`

**方法**: `GET`

**权限**: 需要管理员权限

**查询参数**:

- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为10
- `search` (可选): 搜索关键词
- `status` (可选): 账号状态筛选

**成功响应**:

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "账号ID",
        "username": "用户名",
        "userId": "用户ID",
        "steamId": "Steam ID",
        "status": "active",
        "createdAt": "2023-01-01T00:00:00Z",
        "lastLogin": "2023-01-02T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 10,
      "currentPage": 1,
      "limit": 10
    }
  }
}
```

#### 创建账号

**URL**: `/api/admin/accounts`

**方法**: `POST`

**权限**: 需要管理员权限

**请求参数**:

```json
{
  "username": "用户名",
  "userId": "用户ID",
  "steamId": "Steam ID"
}
```

**成功响应**:

```json
{
  "success": true,
  "message": "账号创建成功",
  "account": {
    "id": "账号ID",
    "username": "用户名",
    "userId": "用户ID",
    "steamId": "Steam ID",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

#### 更新账号

**URL**: `/api/admin/accounts`

**方法**: `PUT`

**权限**: 需要管理员权限

**请求参数**:

```json
{
  "id": "账号ID",
  "username": "用户名",
  "userId": "用户ID",
  "steamId": "Steam ID",
  "status": "active"
}
```

**成功响应**:

```json
{
  "success": true,
  "message": "账号更新成功",
  "account": {
    "id": "账号ID",
    "username": "用户名",
    "userId": "用户ID",
    "steamId": "Steam ID",
    "status": "active",
    "createdAt": "2023-01-01T00:00:00Z",
    "lastLogin": "2023-01-02T00:00:00Z"
  }
}
```

#### 删除账号

**URL**: `/api/admin/accounts?id=账号ID`

**方法**: `DELETE`

**权限**: 需要管理员权限

**成功响应**:

```json
{
  "success": true,
  "message": "账号删除成功"
}
```

### 日志管理

#### 获取日志列表

**URL**: `/api/admin/logs`

**方法**: `GET`

**权限**: 需要管理员权限

**查询参数**:

- `page` (可选): 页码，默认为1
- `limit` (可选): 每页数量，默认为20
- `action` (可选): 动作类型筛选
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期

**成功响应**:

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "日志ID",
        "action": "USER_LOGIN",
        "details": "用户登录成功",
        "ip": "127.0.0.1",
        "timestamp": "2023-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "totalPages": 5,
      "currentPage": 1,
      "limit": 20
    }
  }
}
```

### 测试数据库连接

测试数据库连接状态。

**URL**: `/api/admin/debug/connection`

**方法**: `GET`

**权限**: 需要管理员权限

**成功响应**:

```json
{
  "success": true,
  "message": "数据库连接成功",
  "result": {
    "test": 1
  },
  "connectionInfo": {
    "duration": 15
  }
}
```

## 错误处理

所有API可能返回以下错误状态码:

- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未授权访问
- `404 Not Found`: 未找到资源
- `500 Internal Server Error`: 服务器内部错误

错误响应格式:

```json
{
  "success": false,
  "error": "错误描述"
}
```

## 认证机制

系统使用两种认证机制:

1. **用户认证**: 通过完美世界账号登录，使用`x-auth-token`头传递认证信息
2. **管理员认证**: 通过系统账号密码登录，使用Cookie基于会话的认证

## 注意事项

- API请求频率限制: 每分钟30次请求
- 登录状态有效期: 24小时
- Steam ID必须是64位格式 