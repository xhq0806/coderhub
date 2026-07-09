// 用户路由模块集中声明注册、登录、当前用户资料等用户端接口。
const KoaRouter = require('@koa/router')
const userController = require('../controller/user_controller')
const contentController = require('../controller/content_controller')
const interactionController = require('../controller/interaction_controller')
const { verifyAuth } = require('../middleware/auth_middleware')

const userRouter = new KoaRouter()

// 注册用户接口，创建普通用户账号。
userRouter.post('/users', userController.create)

// 登录接口，登录成功后返回 token。
userRouter.post('/login', userController.login)

// 当前用户资料接口，必须携带有效 token。
userRouter.get('/users/me', verifyAuth, userController.me)
userRouter.patch('/users/me', verifyAuth, userController.updateMe)

// 当前用户内容和收藏列表接口。
userRouter.get('/users/me/contents', verifyAuth, contentController.listMine)
userRouter.get('/users/me/favorites', verifyAuth, interactionController.listFavorites)

module.exports = userRouter
