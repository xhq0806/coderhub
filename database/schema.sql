-- coderhub 本地数据库初始化脚本，只创建缺失的数据库和表，不删除已有业务数据。
CREATE DATABASE IF NOT EXISTS `coderhub` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `coderhub`;

-- 用户表保存登录认证、个人资料、角色和账号状态。
CREATE TABLE IF NOT EXISTS `user` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户主键',
  `name` VARCHAR(30) NOT NULL COMMENT '登录用户名',
  `password` VARCHAR(100) NOT NULL COMMENT '加密后的密码',
  `nickname` VARCHAR(30) NULL COMMENT '用户昵称',
  `avatar_file_id` BIGINT UNSIGNED NULL COMMENT '头像文件 ID',
  `intro` VARCHAR(200) NULL COMMENT '个人简介',
  `role` VARCHAR(20) NOT NULL DEFAULT 'user' COMMENT '用户角色：user/admin',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账号状态：active/disabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_name` (`name`),
  KEY `idx_user_role_status` (`role`, `status`),
  KEY `idx_user_avatar_file` (`avatar_file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 文件表保存头像图片和内容图片的元信息，实际文件存放在 uploads 目录。
CREATE TABLE IF NOT EXISTS `file` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '文件主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '上传用户 ID',
  `usage_type` VARCHAR(20) NOT NULL COMMENT '文件用途：avatar/content_image',
  `filename` VARCHAR(255) NOT NULL COMMENT '服务端文件名',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `mime_type` VARCHAR(100) NOT NULL COMMENT 'MIME 类型',
  `size` BIGINT UNSIGNED NOT NULL COMMENT '文件大小',
  `url` VARCHAR(500) NOT NULL COMMENT '文件访问 URL',
  `status` VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '文件状态：active/deleted',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_file_user_usage_status` (`user_id`, `usage_type`, `status`),
  CONSTRAINT `fk_file_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件表';

-- 内容表保存动态正文、审核状态和审核信息。
CREATE TABLE IF NOT EXISTS `content` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '内容主键',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '作者用户 ID',
  `body` TEXT NULL COMMENT '动态正文',
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '内容状态：pending/published/rejected/offline/deleted',
  `reject_reason` VARCHAR(200) NULL COMMENT '审核驳回原因',
  `reviewer_id` BIGINT UNSIGNED NULL COMMENT '审核管理员 ID',
  `reviewed_at` DATETIME NULL COMMENT '审核时间',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_content_status_created` (`status`, `created_at`),
  KEY `idx_content_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_content_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_content_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容表';

-- 评论表通过 parent_id 支持一级评论和回复评论。
CREATE TABLE IF NOT EXISTS `comment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '评论主键',
  `content_id` BIGINT UNSIGNED NOT NULL COMMENT '所属内容 ID',
  `user_id` BIGINT UNSIGNED NOT NULL COMMENT '评论作者 ID',
  `parent_id` BIGINT UNSIGNED NULL COMMENT '父评论 ID，NULL 表示一级评论',
  `body` VARCHAR(500) NOT NULL COMMENT '评论内容',
  `status` VARCHAR(20) NOT NULL DEFAULT 'visible' COMMENT '评论状态：visible/deleted',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_comment_content_status_created` (`content_id`, `status`, `created_at`),
  KEY `idx_comment_parent_status` (`parent_id`, `status`),
  CONSTRAINT `fk_comment_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`),
  CONSTRAINT `fk_comment_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  CONSTRAINT `fk_comment_parent` FOREIGN KEY (`parent_id`) REFERENCES `comment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评论表';

-- 标签表由后台维护，用户端只能选择启用标签。
CREATE TABLE IF NOT EXISTS `tag` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '标签主键',
  `name` VARCHAR(30) NOT NULL COMMENT '标签名称',
  `status` VARCHAR(20) NOT NULL DEFAULT 'enabled' COMMENT '标签状态：enabled/disabled',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tag_name` (`name`),
  KEY `idx_tag_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- 内容标签关联表保存内容与标签的多对多关系。
CREATE TABLE IF NOT EXISTS `content_tag` (
  `content_id` BIGINT UNSIGNED NOT NULL COMMENT '内容 ID',
  `tag_id` BIGINT UNSIGNED NOT NULL COMMENT '标签 ID',
  PRIMARY KEY (`content_id`, `tag_id`),
  KEY `idx_content_tag_tag` (`tag_id`),
  CONSTRAINT `fk_content_tag_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`),
  CONSTRAINT `fk_content_tag_tag` FOREIGN KEY (`tag_id`) REFERENCES `tag` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容标签关联表';

-- 内容文件关联表保存动态与内容图片的多对多关系。
CREATE TABLE IF NOT EXISTS `content_file` (
  `content_id` BIGINT UNSIGNED NOT NULL COMMENT '内容 ID',
  `file_id` BIGINT UNSIGNED NOT NULL COMMENT '文件 ID',
  PRIMARY KEY (`content_id`, `file_id`),
  KEY `idx_content_file_file` (`file_id`),
  CONSTRAINT `fk_content_file_content` FOREIGN KEY (`content_id`) REFERENCES `content` (`id`),
  CONSTRAINT `fk_content_file_file` FOREIGN KEY (`file_id`) REFERENCES `file` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容文件关联表';
