import nodemailer from 'nodemailer';
import { ENV } from '../../config';


const transporter = nodemailer.createTransport({
    host: ENV.EMAIL_HOST,
    port: ENV.EMAIL_PORT,
    secure: ENV.EMAIL_SECURE,
    auth: {
        user: ENV.EMAIL_USER,
        pass: ENV.EMAIL_PASS,
    },
});


interface EmailOptions {
    email: string;
    subject: string;
    message: string;
}

export const sendEmail = async (options: EmailOptions) => {
    const mailOptions = {
        from: ENV.EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };


    await transporter.sendMail(mailOptions);
};
