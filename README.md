# 操作步骤
## 1.在`public_html`中分别建立`app.js`和`package.json`,然后把对应代码复制进去保存
## 2.回到面板点击左栏 `Website Management`➡`NodeJs APP`➡`Create application`➡`CREAT`E先看图
## 3.`Node.js version`➡版本选择最新
## 4.`Application root`➡`domains/xxx.xxxx.com/public_html` (替换自己的完整域名)切记不要填写错误
## 5.`Application startup file`➡`app.js`
## 6.点击`Add variable`添加环境变量
      - 6.1 `DOMAIN`➡你的域名
      - 6.2 `PORT` ➡端口（自己随便填写别人没用过的端口，如果出现503就换一个）
      - 6.3 `UUID`➡生成的[UUID](https://1024tools.com/uuid)
## 7.点击`CREATE`创建
## 8.点击`RUN NPM INSTALL` 然后点`RUN JS SCRIPT`
