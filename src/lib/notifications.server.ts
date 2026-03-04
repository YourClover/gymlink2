import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db.server'
import { requireAdmin, requireAuth } from './auth-guard.server'
import type { NotificationType } from '@prisma/client'

// Get notifications for a user
export const getNotifications = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      token: string | null
      unreadOnly?: boolean
      limit?: number
      offset?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(data.unreadOnly && { isRead: false }),
      },
      take: data.limit ?? 50,
      skip: data.offset ?? 0,
      orderBy: { createdAt: 'desc' },
    })

    return { notifications }
  })

// Mark a notification as read
export const markNotificationRead = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { notificationId: string; token: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.notification.updateMany({
      where: { id: data.notificationId, userId },
      data: { isRead: true },
    })
    return { success: true }
  })

// Mark all notifications as read
export const markAllNotificationsRead = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  })

// Get unread notification count
export const getUnreadNotificationCount = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string | null }) => data)
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    })
    return { count }
  })

// Create a notification (internal helper)
// Includes deduplication to prevent duplicate notifications for the same action
export const createNotification = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      token: string | null
      type: NotificationType
      title: string
      message: string
      referenceId?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    // Check for duplicate notification within the last hour
    // This prevents spam from repeated actions (e.g., follow/unfollow cycles)
    if (data.referenceId) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: data.type,
          referenceId: data.referenceId,
          createdAt: { gte: oneHourAgo },
        },
      })

      if (existing) {
        // Return the existing notification instead of creating a duplicate
        return { notification: existing, deduplicated: true }
      }
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
      },
    })
    return { notification, deduplicated: false }
  })

// Delete a notification
export const deleteNotification = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: { notificationId: string; token: string | null }) => data,
  )
  .handler(async ({ data }) => {
    const { userId } = await requireAuth(data.token)

    await prisma.notification.deleteMany({
      where: { id: data.notificationId, userId },
    })
    return { success: true }
  })
