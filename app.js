// 引入所需的模块
const http = require('http'); // HTTP 模块用于创建 HTTP 服务器
const os = require('os'); // OS 模块用于获取系统信息
const fs = require('fs'); // FS 模块用于文件操作
const axios = require('axios'); // Axios 用于发起网络请求（下载文件）
const path = require('path'); // Path 模块用于处理路径
const net = require('net'); // Net 模块用于建立 TCP 连接
const { exec } = require('child_process'); // 执行 shell 命令
const { WebSocket, createWebSocketStream } = require('ws'); // WebSocket 模块用于建立 WebSocket 通信

// 日志函数
const log = (...args) => console.log('[INFO]', ...args); // 输出普通日志
const error = (...args) => console.error('[ERROR]', ...args); // 输出错误日志

// 配置对象，从环境变量中读取配置项，若未设置则使用默认值
const CONFIG = {
    UUID: process.env.UUID || 'b28f60af-d0b9-4ddf-baaa-7e49c93c380b',
    NEZHA_SERVER: process.env.NEZHA_SERVER || '',
    NEZHA_PORT: process.env.NEZHA_PORT || '443',
    NEZHA_KEY: process.env.NEZHA_KEY || '',
    DOMAIN: process.env.DOMAIN || '',
    NAME: process.env.NAME || 'webhostmost-GCP',
    PORT: process.env.PORT,
};

// 将 UUID 中的 '-' 移除，用于后续校验
const uuid = CONFIG.UUID.replace(/-/g, '');

/**
 * 创建 HTTP 服务器
 */
function createHttpServer() {
    const server = http.createServer((req, res) => {
        const contentType = { 'Content-Type': 'text/plain' };

        // 处理不同 URL 请求
        if (req.url === '/') {
            res.writeHead(200, contentType);
            res.end('Hello, World\n');
        } else if (req.url === `/${UUID}`) {
            // 返回建议端口
            const MIN_PORT = 10000;
            const MAX_PORT = 65000;

            res.writeHead(503, contentType);

            let port = parseInt(CONFIG.PORT, 10);
            if (isNaN(port) || port < MIN_PORT || port > MAX_PORT) {
                port = Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
            }

            res.end(`Service Unavailable - New Port Suggestion: ${port}\n`);
        } else if (req.url === '/UUID') {
            // 返回 Base64 编码的 VLESS 配置链接
            const vlessURL = `vless://${CONFIG.UUID}@${CONFIG.DOMAIN}:443?encryption=none&security=tls&sni=${CONFIG.DOMAIN}&type=ws&host=${CONFIG.DOMAIN}&path=%2F#v1-ws-tls-${CONFIG.NAME}`;
            const base64Content = Buffer.from(vlessURL).toString('base64');
            res.writeHead(200, contentType);
            res.end(base64Content + '\n');
        } else {
            res.writeHead(404, contentType);
            res.end('Not Found\n');
        }
    });

    // 启动 HTTP 服务器并监听指定端口
    server.listen(CONFIG.PORT || 0, () => {
        const actualPort = server.address().port;
        log(`HTTP Server is running on port ${actualPort}`);
    });

    return server;
}

/**
 * 判断当前系统架构是 arm 还是 amd
 */
function getSystemArchitecture() {
    const arch = os.arch();
    return arch.includes('arm') ? 'arm' : 'amd';
}

/**
 * 下载指定文件到本地
 */
function downloadFile(fileName, fileUrl) {
    return new Promise((resolve, reject) => {
        const filePath = path.join('./', fileName);
        const writer = fs.createWriteStream(filePath);
        axios({
            method: 'get',
            url: fileUrl,
            responseType: 'stream',
        })
            .then(response => {
                response.data.pipe(writer);
                writer.on('finish', () => {
                    writer.close();
                    resolve(fileName);
                });
            })
            .catch(err => {
                reject(`Download ${fileName} failed: ${err.message}`);
            });
    });
}

/**
 * 根据系统架构返回需要下载的文件列表
 */
function getFilesForArchitecture(architecture) {
    const files = {
        arm: [{ fileName: 'npm', fileUrl: 'https://github.com/eooce/test/releases/download/ARM/swith' }],
        amd: [{ fileName: 'npm', fileUrl: 'https://github.com/eooce/test/releases/download/bulid/swith' }],
    };
    return files[architecture] || [];
}

/**
 * 下载对应架构的文件，并调用授权函数
 */
async function downloadFiles() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        error('No files found for the current architecture');
        return;
    }

    try {
        for (const fileInfo of filesToDownload) {
            await downloadFile(fileInfo.fileName, fileInfo.fileUrl);
            log(`Downloaded ${fileInfo.fileName} successfully`);
        }
        authorizeFiles();
    } catch (err) {
        error(err);
    }
}

/**
 * 授权并运行下载的二进制文件
 */
function authorizeFiles() {
    const filePath = './npm';

    fs.access(filePath, fs.constants.F_OK, err => {
        if (err) {
            error(`File does not exist: ${filePath}`);
            return;
        }

        const newPermissions = 0o775;
        fs.chmod(filePath, newPermissions, chmodErr => {
            if (chmodErr) {
                error(`Failed to set permissions: ${chmodErr}`);
                return;
            }
            log(`Permissions set to ${newPermissions.toString(8)}`);

            if (CONFIG.NEZHA_SERVER && CONFIG.NEZHA_PORT && CONFIG.NEZHA_KEY) {
                const NEZHA_TLS = CONFIG.NEZHA_PORT === '443' ? '--tls' : '';
                const command = `./npm -s ${CONFIG.NEZHA_SERVER}:${CONFIG.NEZHA_PORT} -p ${CONFIG.NEZHA_KEY} ${NEZHA_TLS} --skip-conn --disable-auto-update --skip-procs --report-delay 4 >/dev/null 2>&1 &`;
                exec(command, execErr => {
                    if (execErr) {
                        error(`Failed to run npm: ${execErr}`);
                    } else {
                        log('npm is running');
                    }
                });
            } else {
                error('NEZHA environment variables are missing, skipping run');
            }
        });
    });
}

/**
 * 创建 WebSocket 服务器，实现流量转发
 */
function createWebSocketServer(server) {
    const wss = new WebSocket.Server({ server });
    wss.on('connection', ws => {
        log('WebSocket connection established');
        ws.on('message', msg => {
            if (msg.length < 18) {
                error('Invalid message length');
                return;
            }
            try {
                const [VERSION] = msg;
                const id = msg.slice(1, 17);
                if (!id.every((v, i) => v === parseInt(uuid.substr(i * 2, 2), 16))) {
                    error('UUID validation failed');
                    return;
                }
                let i = msg.slice(17, 18).readUInt8() + 19;
                const port = msg.slice(i, (i += 2)).readUInt16BE(0);
                const ATYP = msg.slice(i, (i += 1)).readUInt8();
                const host =
                    ATYP === 1
                        ? msg.slice(i, (i += 4)).join('.')
                        : ATYP === 2
                        ? new TextDecoder().decode(msg.slice(i + 1, (i += 1 + msg.slice(i, i + 1).readUInt8())))
                        : ATYP === 3
                        ? msg.slice(i, (i += 16))
                              .reduce((s, b, j, arr) => (j % 2 ? s.concat(arr.slice(j - 1, j + 1)) : s), [])
                              .map(b => b.readUInt16BE(0).toString(16))
                              .join(':')
                        : '';
                log(`Connecting to: ${host}:${port}`);
                ws.send(new Uint8Array([VERSION, 0]));
                const duplex = createWebSocketStream(ws);
                net.connect({ host, port }, function () {
                    this.write(msg.slice(i));
                    duplex.on('error', err => error(`E1: ${err.message}`))
                        .pipe(this)
                        .on('error', err => error(`E2: ${err.message}`))
                        .pipe(duplex);
                }).on('error', err => error(`Connection error: ${err.message}`));
            } catch (err) {
                error(`Error processing message: ${err.message}`);
            }
        }).on('error', err => error(`WebSocket error: ${err.message}`));
    });
}

/**
 * 主函数：启动 HTTP、WebSocket 服务并下载文件
 */
async function main() {
    const httpServer = createHttpServer();
    createWebSocketServer(httpServer);
    await downloadFiles();
}

main().catch(err => error(`Application error: ${err}`));
