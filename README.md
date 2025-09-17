# 图片OCR识别Web应用

一个基于Node.js和Express的图片OCR识别Web应用，支持图片上传、webhook调用和结果展示。

## 功能特点

- 📸 **图片上传**: 支持拖拽上传和点击选择，支持多种图片格式
- 🔍 **OCR识别**: 通过webhook调用外部OCR服务进行图片文字识别
- 🎨 **美观界面**: 采用蓝白色主题，简洁现代的设计
- 📱 **响应式设计**: 支持桌面端和移动端访问
- ⚡ **实时反馈**: 实时显示处理状态和结果
- 📋 **结果管理**: 支持文本复制和重新识别

## 技术栈

- **后端**: Node.js + Express.js
- **前端**: HTML5 + CSS3 + JavaScript (ES6+)
- **文件上传**: Multer
- **UI组件**: Font Awesome 图标
- **字体**: Inter 字体

## 项目结构

```
img-ocr-n8n/
├── package.json          # 项目依赖配置
├── server.js            # Express服务器主文件
├── public/              # 前端静态文件
│   ├── index.html       # 主页面
│   ├── style.css        # 样式文件
│   └── script.js        # 前端逻辑
├── uploads/             # 图片上传目录（自动创建）
└── README.md           # 项目说明文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
# 生产模式
npm start

# 开发模式（需要安装nodemon）
npm run dev
```

### 3. 访问应用

打开浏览器访问: http://localhost:3000

## 配置说明

### 环境变量

在项目根目录创建 `.env` 文件（可选）:

```env
PORT=3000
OCR_WEBHOOK_URL=https://your-ocr-service.com/webhook
BASE_URL=http://localhost:3000
```

### Webhook集成

应用已集成真实的OCR webhook服务：

- **Webhook地址**: `http://localhost:5678/webhook/773ced4a-d812-4ecf-84e8-ee3bfefe277f`
- **调用方式**: 当用户点击"开始识别"按钮时自动调用
- **回调接口**: `http://localhost:3000/api/webhook/ocr-result`
- **处理流程**: 异步调用 → 轮询状态 → 展示结果

#### Webhook请求格式

应用会向配置的webhook URL发送以下格式的POST请求：

```json
{
  "processingId": "proc_1234567890_abc123",
  "imageUrl": "http://localhost:3000/uploads/image-123456.jpg",
  "callbackUrl": "http://localhost:3000/api/webhook/ocr-result",
  "metadata": {
    "originalName": "sample.jpg",
    "size": 125000,
    "uploadTime": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Webhook回调格式

OCR服务应该向 `callbackUrl` 发送处理结果：

```json
{
  "processingId": "proc_1234567890_abc123",
  "result": {
    "text": "识别到的文字内容",
    "confidence": 0.95,
    "language": "zh-CN",
    "boundingBoxes": [
      {
        "text": "文字块",
        "x": 10,
        "y": 20,
        "width": 100,
        "height": 30
      }
    ]
  },
  "error": null
}
```

## API接口

### 上传图片

```http
POST /api/upload
Content-Type: multipart/form-data

参数:
- image: 图片文件 (必需)

响应:
{
  "success": true,
  "processingId": "proc_1234567890_abc123",
  "imageInfo": {...},
  "message": "Image uploaded successfully. Processing..."
}
```

### 获取处理结果

```http
GET /api/result/:processingId

响应:
{
  "status": "completed|processing|error",
  "imageInfo": {...},
  "result": {...},
  "error": null
}
```

### Webhook回调接口

```http
POST /api/webhook/ocr-result
Content-Type: application/json

{
  "processingId": "string",
  "result": {...},
  "error": "string"
}
```

## 支持的图片格式

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- WebP (.webp)

## 文件大小限制

- 最大文件大小: 10MB

## 部署说明

### 本地部署

1. 确保安装了Node.js (版本 >= 14)
2. 克隆项目并安装依赖
3. 启动服务器

### 云服务部署

应用可以轻松部署到各种云平台：

- **Heroku**: 添加 `Procfile`
- **Vercel**: 配置 `vercel.json`
- **Railway**: 直接从Git部署
- **Docker**: 添加 `Dockerfile`

### 反向代理配置

如果使用Nginx反向代理，建议增加以下配置：

```nginx
client_max_body_size 10M;
proxy_timeout 300s;
proxy_read_timeout 300s;
```

## 开发说明

### 目录说明

- `server.js`: Express服务器，处理API请求和文件上传
- `public/`: 前端静态文件
  - `index.html`: 主页面，包含上传界面和结果展示
  - `style.css`: 样式文件，实现蓝白色主题
  - `script.js`: 前端交互逻辑
- `uploads/`: 用户上传的图片存储目录

### 自定义样式

项目使用CSS变量定义颜色主题，可以在 `style.css` 的 `:root` 选择器中修改：

```css
:root {
  --primary-blue: #2563eb;
  --primary-blue-dark: #1d4ed8;
  --light-blue: #dbeafe;
  /* ... 其他颜色变量 */
}
```

### 调试功能

前端提供了调试工具，在浏览器控制台中使用：

```javascript
// 查看当前状态
window.debugApp.getCurrentFile()
window.debugApp.getCurrentProcessingId()

// 测试Toast消息
window.debugApp.showTestToast('测试消息', 'success')

// 重置应用状态
window.debugApp.resetApp()
```

## 故障排除

### 常见问题

1. **文件上传失败**
   - 检查文件格式是否支持
   - 确认文件大小是否超过10MB限制

2. **处理超时**
   - 检查webhook服务是否正常
   - 查看服务器日志获取详细错误信息

3. **样式显示异常**
   - 确认CDN资源加载正常
   - 检查浏览器控制台错误信息

### 日志查看

服务器会输出详细的日志信息：

```bash
# 查看应用启动信息
npm start

# 查看详细调试信息
DEBUG=* npm start
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request来帮助改进项目。

## 联系方式

如有问题或建议，请通过GitHub Issue联系我们。
