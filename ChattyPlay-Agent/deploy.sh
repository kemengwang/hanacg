#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目名称
PROJECT_NAME="chattyplay-agent"
IMAGE_NAME="${PROJECT_NAME}:latest"
CONTAINER_NAME="${PROJECT_NAME}-web"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Docker 部署脚本${NC}"
echo -e "${GREEN}======================================${NC}"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装，请先安装 Docker${NC}"
    exit 1
fi

# 构建镜像
echo -e "${YELLOW}步骤 1/4: 构建 Docker 镜像...${NC}"
docker build -t $IMAGE_NAME .
if [ $? -ne 0 ]; then
    echo -e "${RED}镜像构建失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 镜像构建成功${NC}"

# 停止并删除旧容器
echo -e "${YELLOW}步骤 2/4: 停止旧容器...${NC}"
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    docker stop $CONTAINER_NAME 2>/dev/null
    docker rm $CONTAINER_NAME 2>/dev/null
    echo -e "${GREEN}✓ 旧容器已删除${NC}"
else
    echo -e "${GREEN}✓ 没有运行中的旧容器${NC}"
fi

# 运行新容器
echo -e "${YELLOW}步骤 3/4: 启动新容器...${NC}"
docker run -d \
    --name $CONTAINER_NAME \
    -p 80:80 \
    --restart unless-stopped \
    $IMAGE_NAME

if [ $? -ne 0 ]; then
    echo -e "${RED}容器启动失败${NC}"
    exit 1
fi
echo -e "${GREEN}✓ 容器启动成功${NC}"

# 查看容器状态
echo -e "${YELLOW}步骤 4/4: 检查容器状态...${NC}"
docker ps -f name=$CONTAINER_NAME

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✓ 部署完成！${NC}"
echo -e "${GREEN}访问地址: http://localhost${NC}"
echo -e "${GREEN}======================================${NC}"

# 显示日志
echo -e "${YELLOW}容器日志 (按 Ctrl+C 退出):${NC}"
docker logs -f $CONTAINER_NAME
