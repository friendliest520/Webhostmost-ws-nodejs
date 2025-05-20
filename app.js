// 引入所需的模块
const http = require('http'); // HTTP 服务器模块
const os = require('os'); // 操作系统相关功能模块
const { Buffer } = require('buffer'); // 处理二进制数据的模块
const fs = require('fs'); // 文件系统模块
const axios = require('axios'); // HTTP 请求模块
const path = require('path'); // 路径处理模块
const net = require('net'); // 网络通信模块
const { exec } = require('child_process'); // 执行系统命令模块
const { WebSocket, createWebSocketStream } = require('ws'); // WebSocket 模块

// 日志函数
const log = (...args) => console.log('[INFO]', ...args); // 普通日志
const error = (...args) => console.error('[ERROR]', ...args); // 错误日志

// 从环境变量中获取配置，未设置时使用默认值
const UUID = process.env.UUID || 'b28f60af-d0b9-4ddf-baaa-7e49c93c380b'; // UUID，用于唯一标识
const uuid = UUID.replace(/-/g, ''); // 移除 UUID 中的横线
const NEZHA_SERVER = process.env.NEZHA_SERVER || ''; // 哪吒监控服务器地址
const NEZHA_PORT = process.env.NEZHA_PORT || '443'; // 哪吒监控服务器端口，默认 443
const NEZHA_KEY = process.env.NEZHA_KEY || ''; // 哪吒监控密钥
const DOMAIN = process.env.DOMAIN || ''; // 项目域名或反代域名
const NAME = process.env.NAME || 'webhostmost-GCP'; // 项目名称
const port = process.env.PORT || Math.floor(Math.random() * (65000 - 10000 + 1)) + 10000; // HTTP 服务器端口，如果未设置则使用随机端口范围10000至65000

// 创建 HTTP 服务器
function createHttpServer() {
    const server = http.createServer((req, res) => {
        if (req.url === '/') {
            // 处理根路径请求，返回 "Hello, World"
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Hello, World\n');
        } else if (req.url === '/${UUID}') {
            // 处理其他路径请求，返回503状态码，重新分配端口
            const MIN_PORT = 10000;
            const MAX_PORT = 65000;
        
            res.writeHead(503, contentType);
        
            // 获取合法的环境端口或随机生成一个可用端口
            let port = parseInt(process.env.PORT, 10);
            if (isNaN(port) || port < MIN_PORT || port > MAX_PORT) {
                port = Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
            }else if (req.url === `/${UUID}`) {
            // 处理 UUID 路径请求，生成 vless 协议的 URL 并返回 Base64 编码
            const vlessURL = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&type=ws&host=${DOMAIN}&path=%2F#v1-ws-tls-${NAME}`;
            const base64Content = Buffer.from(vlessURL).toString('base64');
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(base64Content + '\n');
        } else {
            // 处理其他路径请求，返回 404 状态码
            res.writeHead(404, contentType);
            res.end('Not Found\n');
        }
    });

    // 启动 HTTP 服务器，监听指定端口
    server.listen(port, () => {
        const actualPort = server.address().port; // 获取实际分配的端口号
        log(`HTTP Server is running on port ${actualPort}`);
    });

    return server;
}

// 判断系统架构
function getSystemArchitecture() {
    const arch = os.arch(); // 获取系统架构
    return arch.includes('arm') ? 'arm' : 'amd'; // 如果是 ARM 架构，返回 'arm'，否则返回 'amd'
}

// 下载文件
function downloadFile(fileName, fileUrl) {
    return new Promise((resolve, reject) => {
        const filePath = path.join('./', fileName); // 文件保存路径
        const writer = fs.createWriteStream(filePath); // 创建可写流
        axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream', // 以流的形式下载文件
        })
            .then(response => {
                response.data.pipe(writer); // 将下载的数据写入文件
                writer.on('finish', () => {
                    writer.close(); // 关闭可写流
                    resolve(fileName); // 下载成功，返回文件名
                });
            })
            .catch(err => {
                reject(`Download ${fileName} failed: ${err.message}`); // 下载失败，返回错误信息
            });
    });
}

// 下载对应系统架构的文件
async function downloadFiles() {
    const architecture = getSystemArchitecture(); // 获取系统架构
    const filesToDownload = getFilesForArchitecture(architecture); // 获取需要下载的文件列表

    if (filesToDownload.length === 0) {
        error('No files found for the current architecture'); // 如果没有找到对应架构的文件，输出错误日志
        return;
    }

    try {
        for (const fileInfo of filesToDownload) {
            await downloadFile(fileInfo.fileName, fileInfo.fileUrl); // 下载文件
            log(`Downloaded ${fileInfo.fileName} successfully`); // 下载成功，输出日志
        }
        authorizeFiles(); // 所有文件下载完成后，授权并运行文件
    } catch (err) {
        error(err); // 下载失败，输出错误日志
    }
}

// 根据系统架构返回需要下载的文件列表
function getFilesForArchitecture(architecture) {
    const files = {
        arm: [{ fileName: 'npm', fileUrl: 'https://github.com/eooce/test/releases/download/ARM/swith' }], // ARM 架构的文件
        amd: [{ fileName: 'npm', fileUrl: 'https://github.com/eooce/test/releases/download/bulid/swith' }], // AMD 架构的文件
    };
    return files[architecture] || []; // 返回对应架构的文件列表，如果没有则返回空数组
}

// 授权并运行文件
function authorizeFiles() {
    const filePath = './npm'; // 文件路径
    const newPermissions = 0o775; // 新权限（可读、可写、可执行）
    fs.chmod(filePath, newPermissions, err => {
        if (err) {
            error(`Failed to set permissions: ${err}`); // 授权失败，输出错误日志
            return;
        }
        log(`Permissions set to ${newPermissions.toString(8)}`); // 授权成功，输出日志

        if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
            const NEZHA_TLS = NEZHA_PORT === '443' ? '--tls' : ''; // 如果端口为 443，开启 TLS
            const command = `./npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --skip-conn --disable-auto-update --skip-procs --report-delay 4 >/dev/null 2>&1 &`; // 运行命令
            exec(command, err => {
                if (err) {
                    error(`Failed to run npm: ${err}`); // 运行失败，输出错误日志
                } else {
                    log('npm is running'); // 运行成功，输出日志
                }
            });
        } else {
            error('NEZHA environment variables are missing, skipping run'); // 如果环境变量不全，跳过运行
        }
    });
}

// 创建 WebSocket 服务器
function createWebSocketServer(server) {
    const wss = new WebSocket.Server({ server }); // 创建 WebSocket 服务器
    wss.on('connection', ws => {
        log('WebSocket connection established'); // WebSocket 连接成功，输出日志
        ws.on('message', msg => {
            if (msg.length < 18) {
                error('Invalid message length'); // 如果消息长度无效，输出错误日志
                return;
            }
            try {
                const [VERSION] = msg; // 解析消息版本
                const id = msg.slice(1, 17); // 解析消息 ID
                if (!id.every((v, i) => v === parseInt(uuid.substr(i * 2, 2), 16))) {
                    error('UUID validation failed'); // 如果 UUID 验证失败，输出错误日志
                    return;
                }
                let i = msg.slice(17, 18).readUInt8() + 19; // 解析消息中的偏移量
                const port = msg.slice(i, (i += 2)).readUInt16BE(0); // 解析目标端口
                const ATYP = msg.slice(i, (i += 1)).readUInt8(); // 解析地址类型
                const host =
                    ATYP === 1
                        ? msg.slice(i, (i += 4)).join('.') // IPv4 地址
                        : ATYP === 2
                        ? new TextDecoder().decode(msg.slice(i + 1, (i += 1 + msg.slice(i, i + 1).readUInt8()))) // 域名
                        : ATYP === 3
                        ? msg.slice(i, (i += 16))
                              .reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), [])
                              .map(b => b.readUInt16BE(0).toString(16))
                              .join(':') // IPv6 地址
                        : ''; // 未知类型
                log(`Connecting to: ${host}:${port}`); // 输出连接信息
                ws.send(new Uint8Array([VERSION, 0])); // 发送响应消息
                const duplex = createWebSocketStream(ws); // 创建 WebSocket 双工流
                net.connect({ host, port }, function () {
                    this.write(msg.slice(i)); // 将消息写入目标主机
                    duplex.on('error', err => error(`E1: ${err.message}`)) // 处理数据流错误
                        .pipe(this)
                        .on('error', err => error(`E2: ${err.message}`))
                        .pipe(duplex);
                }).on('error', err => error(`Connection error: ${err.message}`)); // 处理连接错误
            } catch (err) {
                error(`Error processing message: ${err.message}`); // 处理消息时出错，输出错误日志
            }
        }).on('error', err => error(`WebSocket error: ${err.message}`)); // 处理 WebSocket 错误
    });
}

// 主函数
async function main() {
    const httpServer = createHttpServer(); // 创建 HTTP 服务器
    createWebSocketServer(httpServer); // 创建 WebSocket 服务器
    await downloadFiles(); // 下载文件
}

// 启动主函数，捕获并处理错误
main().catch(err => error(`Application error: ${err}`));
