import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const imageUrl = req.query.url as string;

    // Security: ตรวจสอบให้แน่ใจว่าเป็น URL จาก LINE เท่านั้น
    if (!imageUrl || !imageUrl.startsWith("https://profile.line-scdn.net")) {
      return res.status(400).json({ message: "Invalid or forbidden URL." });
    }

    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).send(imageResponse.statusText);
    }

    // ดึง content-type header จาก response เดิม
    const contentType = imageResponse.headers.get("content-type");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // ส่งข้อมูลรูปภาพกลับไปให้ client
    const imageBuffer = await imageResponse.arrayBuffer();

    res.send(Buffer.from(imageBuffer));
  } catch (error) {
    console.error("Image proxy error:", error);
    res.status(500).json({ message: "Error fetching the image." });
  }
}
