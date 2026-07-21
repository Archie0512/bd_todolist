// 工作任务清单 - 启动脚本
// Sets environment variables and starts the Tasks.md server

process.env.PORT = '8080';
process.env.CONFIG_DIR = 'config';
process.env.TASKS_DIR = 'tasks';
process.env.BASE_PATH = '/';
process.env.TITLE = '工作任务清单';
process.env.LOCAL_IMAGES_CLEANUP_INTERVAL = '0';

console.log('========================================');
console.log('  工作任务清单 (Tasks.md)');
console.log('========================================');
console.log('');
console.log('服务启动中...');
console.log('访问地址: http://localhost:8080');
console.log('');

// 3秒后自动打开浏览器
setTimeout(() => {
    const { exec } = require('child_process');
    exec('start http://localhost:8080', (err) => {
        if (err) console.log('浏览器未自动打开，请手动访问 http://localhost:8080');
    });
}, 3000);

// 启动服务器
require('./server.js');