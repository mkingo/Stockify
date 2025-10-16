import nodemailer from 'nodemailer';
import { WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE } from "@/lib/nodemailer/templates";
import { buildUnsubscribeUrl, buildOneClickUnsubscribeUrl } from "@/lib/unsubscribe";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro);

    const unsubUrl = buildUnsubscribeUrl(email);
    const oneClickUrl = buildOneClickUnsubscribeUrl(email);

    // Append a small footer with unsubscribe info
    const unsubFooter = `\n\nTo unsubscribe from future emails, visit: ${unsubUrl}`;
    const htmlWithUnsub = htmlTemplate.includes('</body>')
        ? htmlTemplate.replace('</body>', `<p style="margin-top:24px;font-size:12px;color:#9ca3af;">If you no longer wish to receive emails, <a href="${unsubUrl}">unsubscribe here</a>.</p></body>`) 
        : htmlTemplate + `<hr/><p style="margin-top:24px;font-size:12px;color:#9ca3af;">If you no longer wish to receive emails, <a href="${unsubUrl}">unsubscribe here</a>.</p>`;

    const mailOptions = {
        from: `"Stockify" <stockify@mkingo>`,
        to: email,
        subject: `Welcome to Stockify - your stock market toolkit is ready!`,
        text: 'Thanks for joining Stockify' + unsubFooter,
        html: htmlWithUnsub,
        headers: {
            'List-Unsubscribe': `<${oneClickUrl}>, <mailto:${process.env.NODEMAILER_EMAIL}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
    } as const;

    await transporter.sendMail(mailOptions as any);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const unsubUrl = buildUnsubscribeUrl(email);
    const oneClickUrl = buildOneClickUnsubscribeUrl(email);

    const unsubFooter = `\n\nTo unsubscribe from future emails, visit: ${unsubUrl}`;
    const htmlWithUnsub = htmlTemplate.includes('</body>')
        ? htmlTemplate.replace('</body>', `<p style="margin-top:24px;font-size:12px;color:#9ca3af;">If you no longer wish to receive emails, <a href="${unsubUrl}">unsubscribe here</a>.</p></body>`) 
        : htmlTemplate + `<hr/><p style="margin-top:24px;font-size:12px;color:#9ca3af;">If you no longer wish to receive emails, <a href="${unsubUrl}">unsubscribe here</a>.</p>`;

    const mailOptions = {
        from: `"Stockify News" <Stockify@mkingo>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from Stockify` + unsubFooter,
        html: htmlWithUnsub,
        headers: {
            'List-Unsubscribe': `<${oneClickUrl}>, <mailto:${process.env.NODEMAILER_EMAIL}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        }
    } as const;

    await transporter.sendMail(mailOptions as any);
};