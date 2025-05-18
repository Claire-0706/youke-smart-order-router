


# 使用官方 Node.js LTS 版本作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 拷贝依赖声明文件
COPY package.json pnpm-lock.yaml* ./

# 安装 pnpm（如未内置）
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 拷贝项目源码
COPY . .

# 构建 TypeScript 项目
RUN pnpm build

# 暴露端口
EXPOSE 3000

# 启动服务
CMD ["node", "dist/index.js"]

# docker build -t youke-smart-order-router .
# docker run --env-file .env -p 3000:3000 youke-smart-order-router