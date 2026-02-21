import { querySingle } from "@/lib/db";

type PushMessageResult =
  | { success: true; status: number }
  | { success: false; status?: number; reason?: string; error?: unknown };

export const sendPushMessage = async (
  lineUserId: string,
  message: string,
): Promise<PushMessageResult> => {
  const channelAccessToken = process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return { success: false, reason: "not-configured" };
  }

  if (!lineUserId) {
    return { success: false, reason: "no-userid" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    const responseBody = await response.json();

    if (!response.ok) {
      return { success: false, status: response.status, error: responseBody };
    }

    return { success: true, status: response.status };
  } catch (error) {
    return { success: false, status: 500, error };
  }
};

export const getLineIdByInternalId = async (
  internalUserId: number,
): Promise<string | null> => {
  if (!internalUserId) return null;
  try {
    const user = await querySingle<{ line_id: string }>(
      "SELECT line_id FROM users WHERE id = ?",
      [internalUserId],
    );

    return user?.line_id ?? null;
  } catch (error) {
    return null;
  }
};
