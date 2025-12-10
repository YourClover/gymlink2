import { createServerFn } from '@tanstack/react-start'
import { prisma } from './db'
import type { NotificationType } from '@prisma/client'

// Get notifications for a user
export const getNotifications = createServerFn({ method: 'GET' })
  .inputValidator(
    (data: {
      userId: string
      unreadOnly?: boolean
      limit?: number
      offset?: number
    }) => data,
  )
  .handler(async ({ data }) => {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: data.userId,
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
  .inputValidator((data: { notificationId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    await prisma.notification.updateMany({
      where: { id: data.notificationId, userId: data.userId },
      data: { isRead: true },
    })
    return { success: true }
  })

// Mark all notifications as read
export const markAllNotificationsRead = createServerFn({ method: 'POST' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    await prisma.notification.updateMany({
      where: { userId: data.userId, isRead: false },
      data: { isRead: true },
    })
    return { success: true }
  })

// Get unread notification count
export const getUnreadNotificationCount = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const count = await prisma.notification.count({
      where: { userId: data.userId, isRead: false },
    })
    return { count }
  })

// Create a notification (internal helper)
export const createNotification = createServerFn({ method: 'POST' })
  .inputValidator(
    (data: {
      userId: string
      type: NotificationType
      title: string
      message: string
      referenceId?: string
    }) => data,
  )
  .handler(async ({ data }) => {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        referenceId: data.referenceId,
      },
    })
    return { notification }
  })

// Delete a notification
export const deleteNotification = createServerFn({ method: 'POST' })
  .inputValidator((data: { notificationId: string; userId: string }) => data)
  .handler(async ({ data }) => {
    await prisma.notification.deleteMany({
      where: { id: data.notificationId, userId: data.userId },
    })
    return { success: true }
  })
