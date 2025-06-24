const Contact = require("../model/contact");
const nodemailer = require("nodemailer");

exports.submitContactForm = async (req, res) => {
  const { user_name, user_email, serviceType, platform, message } = req.body;

  try {
    // Save to MongoDB
    const contact = new Contact({ user_name, user_email, serviceType, platform, message });
    await contact.save();

    // Send Email via nodemailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"EngageSphere Contact Form" <${process.env.EMAIL_USER}>`,
      to: process.env.TO_EMAIL,
      subject: "New Contact Form Submission",
      html: `
        <h2>New Inquiry Received</h2>
        <p><strong>Name:</strong> ${user_name}</p>
        <p><strong>Email:</strong> ${user_email}</p>
        <p><strong>Service:</strong> ${serviceType}</p>
        <p><strong>Platform:</strong> ${platform}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Message submitted successfully!" });
  } catch (err) {
    console.error("Error submitting contact form:", err.message);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
};
