# 操作步骤
## 1.在`public_html`文件中分别建立`app.js`和`package.json`,然后把对应代码复制进去保存(也可以直接上传到`public_html`文件来中，建议上传会快些)
## 2.回到面板点击左栏 `Website Management`➡`NodeJs APP`➡`Create application`➡`CREAT`E先看图
## 3.`Node.js version`➡版本选择最新
## 4.`Application root`➡`public_html` (xxx.xxxx.com替换自己的完整域名)切记不要填写错误，下一排会显示出域名
## 5.`Application startup file`➡`app.js`
## 6.点击`Add variable`添加环境变量
- 环境变量
  - 6.1 `DOMAIN`➡你的域名
  - 6.2 `PORT` ➡端口（自己随便填写别人没用过的端口，如果出现503就换一个），不输就用的随机端口
  - 6.3 `UUID`➡生成的[UUID](https://1024tools.com/uuid)
## 7.点击`CREATE`创建
## 8.点击`RUN NPM INSTALL` 然后点`RUN JS SCRIPT`
## 9.点击`open`
## 10.域名/uuid 查看具体信息
