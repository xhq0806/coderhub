// by AI.Coding：关注服务维护用户主页聚合、关注关系和关注通知。
const connectionPool = require('../app/database')
const userService = require('./user_service')
const notificationService = require('./notification_service')
const { USER_STATUS, NOTIFICATION_TYPE, NOTIFICATION_TARGET } = require('../constants/status')
const { createError } = require('../utils/response')

class FollowService {
  // by AI.Coding：查询可公开访问的 active 用户，disabled 用户对外表现为不存在。
  async assertActiveUser(userId) {
    const user = await userService.findById(userId)
    if (!user || user.status !== USER_STATUS.ACTIVE) throw createError('NOT_FOUND', '用户不存在')
    return user
  }

  // by AI.Coding：获取关注计数和当前 viewer 是否已关注该用户。
  async getFollowState(userId, viewerId) {
    const [rows] = await connectionPool.execute(
      'SELECT (SELECT COUNT(*) FROM user_follow WHERE following_id = ?) AS followerCount, (SELECT COUNT(*) FROM user_follow WHERE follower_id = ?) AS followingCount, EXISTS (SELECT 1 FROM user_follow WHERE follower_id = ? AND following_id = ?) AS viewerFollowing;',
      [userId, userId, viewerId || 0, userId]
    )
    return {
      followerCount: Number(rows[0].followerCount || 0),
      followingCount: Number(rows[0].followingCount || 0),
      viewerFollowing: Boolean(rows[0].viewerFollowing)
    }
  }

  // by AI.Coding：聚合用户公开主页资料、关注计数和 viewer 关注状态。
  async getPublicProfile(userId, viewerId) {
    const user = await this.assertActiveUser(userId)
    const state = await this.getFollowState(userId, viewerId)
    const profile = userService.toUserProfile(user)
    return { user: profile, ...state }
  }

  // by AI.Coding：关注 active 用户，禁止自关注，首次关注生成通知。
  async followUser(followerId, followingId) {
    if (Number(followerId) === Number(followingId)) throw createError('PARAMS_ERROR', '不能关注自己')
    await this.assertActiveUser(followingId)
    const [result] = await connectionPool.execute('INSERT IGNORE INTO user_follow (`follower_id`, `following_id`) VALUES (?, ?);', [followerId, followingId])
    // by AI.Coding：唯一索引吸收并发重复关注，只有新增关系时才生成关注通知。
    if (result.affectedRows > 0) {
      await notificationService.createNotification({ userId: followingId, actorUserId: followerId, type: NOTIFICATION_TYPE.FOLLOW, title: '你有新的关注者', body: '有人关注了你的公开主页。', targetType: NOTIFICATION_TARGET.USER, targetId: followerId })
    }
    return this.getFollowState(followingId, followerId)
  }

  // by AI.Coding：取消关注保持幂等，不存在关系时也返回未关注状态。
  async unfollowUser(followerId, followingId) {
    await this.assertActiveUser(followingId)
    await connectionPool.execute('DELETE FROM user_follow WHERE follower_id = ? AND following_id = ?;', [followerId, followingId])
    return this.getFollowState(followingId, followerId)
  }
}

module.exports = new FollowService()
