import type { Request, Response } from 'express';
import { generateReminderForFamily, logReminder } from '../services/reminder.service.js';

/** POST /api/reminders/generate */
export async function generateReminderHandler(req: Request, res: Response) {
  const { family_id } = req.body;

  const reminder = await generateReminderForFamily(family_id);
  if (!reminder) {
    return res.status(404).json({ error: 'Family not found.' });
  }

  res.json(reminder);
}

/** POST /api/reminders/send */
export async function sendReminderHandler(req: Request, res: Response) {
  const { family_id, family_name, channel, message, tone, suggested_time, sent_by } = req.body;

  const log = await logReminder({
    family_id,
    family_name,
    channel: channel || 'whatsapp',
    message,
    tone: tone || 'polite',
    suggested_time: suggested_time || 'Immediate',
    sent_by: sent_by || 'Staff',
    status: 'sent',
  });

  res.status(201).json({ success: true, reminder: log });
}
