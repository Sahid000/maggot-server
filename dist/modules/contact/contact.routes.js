"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mailer_1 = require("../../utils/mailer");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: "সব তথ্য পূরণ করুন" });
        }
        const adminEmail = process.env.EMAIL_USER;
        if (!adminEmail) {
            return res.status(500).json({ success: false, message: "Server configuration error" });
        }
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px 24px; border-radius: 10px 10px 0 0;">
          <h2 style="color: #fbbf24; margin: 0; font-size: 18px;">📩 নতুন যোগাযোগ বার্তা</h2>
        </div>
        <div style="background: #f9fafb; padding: 24px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 90px;">নাম</td><td style="padding: 6px 0; font-weight: 600; color: #111827;">${name}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">ইমেইল</td><td style="padding: 6px 0; color: #111827;"><a href="mailto:${email}" style="color: #2563eb;">${email}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">বিষয়</td><td style="padding: 6px 0; color: #111827;">${subject}</td></tr>
          </table>
          <div style="margin-top: 16px; padding: 14px; background: #fff; border-left: 3px solid #fbbf24; border-radius: 4px;">
            <p style="margin: 0 0 6px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">বার্তা</p>
            <p style="margin: 0; color: #374151; line-height: 1.6;">${message.replace(/\n/g, "<br>")}</p>
          </div>
          <p style="margin-top: 16px; font-size: 12px; color: #9ca3af;">এই বার্তাটি ম্যাগট-ফ্রি রেসকিউ কিট ওয়েবসাইটের Contact Us ফর্ম থেকে পাঠানো হয়েছে।</p>
        </div>
      </div>
    `;
        const result = await (0, mailer_1.sendEmail)(adminEmail, `[Contact] ${subject} — ${name}`, html);
        if (!result.success) {
            return res.status(500).json({ success: false, message: "বার্তা পাঠাতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।" });
        }
        res.status(200).json({ success: true, message: "আপনার বার্তা পাঠানো হয়েছে। আমরা শীঘ্রই যোগাযোগ করব।" });
    }
    catch (err) {
        console.error("[contact]", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.default = router;
