package services

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"log"
	"net/smtp"
	"time"

	"secureview/internal/config"
	"secureview/internal/models"
)

// EmailService handles sending emails
type EmailService struct {
	cfg *config.Config
}

// NewEmailService creates a new EmailService
func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

// SendInvitationEmail sends an invitation email to a new user
func (s *EmailService) SendInvitationEmail(invitation *models.Invitation, inviterName string, orgName string) error {
	if !s.cfg.Email.Enabled {
		log.Printf("[EmailService] Email is disabled, skipping invitation email to %s", invitation.Email)
		return nil
	}

	inviteURL := fmt.Sprintf("%s/accept-invite?token=%s", s.cfg.Email.AppURL, invitation.Token)
	expiresIn := time.Until(invitation.ExpiresAt).Round(time.Hour)
	expiresText := fmt.Sprintf("%d hours", int(expiresIn.Hours()))
	if expiresIn.Hours() > 48 {
		expiresText = fmt.Sprintf("%d days", int(expiresIn.Hours()/24))
	}

	data := map[string]interface{}{
		"RecipientName": invitation.Name,
		"RecipientEmail": invitation.Email,
		"InviterName":   inviterName,
		"OrgName":       orgName,
		"Role":          formatRole(string(invitation.Role)),
		"InviteURL":     inviteURL,
		"ExpiresIn":     expiresText,
		"Year":          time.Now().Year(),
	}

	subject := fmt.Sprintf("You've been invited to join %s on SecureView", orgName)
	htmlBody, err := s.renderInvitationEmail(data)
	if err != nil {
		return fmt.Errorf("failed to render email template: %w", err)
	}

	return s.sendEmail(invitation.Email, subject, htmlBody)
}

func formatRole(role string) string {
	switch role {
	case "org_admin":
		return "Organization Admin"
	case "manager":
		return "Manager"
	case "member":
		return "Member"
	case "viewer":
		return "Viewer"
	default:
		return role
	}
}

func (s *EmailService) renderInvitationEmail(data map[string]interface{}) (string, error) {
	tmpl := `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecureView Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7fa;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 30px 40px; text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-radius: 16px 16px 0 0;">
                            <div style="display: inline-block; padding: 12px 24px; background: rgba(16, 185, 129, 0.15); border-radius: 12px; margin-bottom: 20px;">
                                <span style="color: #10b981; font-size: 28px; font-weight: bold;">SecureView</span>
                            </div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">You're Invited!</h1>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px;">
                            <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                Hello{{if .RecipientName}} <strong>{{.RecipientName}}</strong>{{end}},
                            </p>

                            <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                <strong>{{.InviterName}}</strong> has invited you to join <strong>{{.OrgName}}</strong> on SecureView as a <strong>{{.Role}}</strong>.
                            </p>

                            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                                <p style="margin: 0 0 8px 0; color: #166534; font-size: 14px; font-weight: 600;">WHAT IS SECUREVIEW?</p>
                                <p style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.5;">
                                    SecureView is a secure document sharing platform that protects sensitive documents with advanced security features including watermarking, access tracking, and screenshot protection.
                                </p>
                            </div>

                            <!-- CTA Button -->
                            <table role="presentation" style="width: 100%; margin: 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{.InviteURL}}" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);">
                                            Accept Invitation
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0 0 24px 0; word-break: break-all;">
                                <a href="{{.InviteURL}}" style="color: #10b981; font-size: 14px;">{{.InviteURL}}</a>
                            </p>

                            <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <p style="margin: 0; color: #92400e; font-size: 13px;">
                                    <strong>Note:</strong> This invitation will expire in <strong>{{.ExpiresIn}}</strong>. Please accept it before then.
                                </p>
                            </div>

                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
                            <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; text-align: center;">
                                This email was sent by SecureView on behalf of {{.OrgName}}.
                            </p>
                            <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                                &copy; {{.Year}} SecureView. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`

	t, err := template.New("invitation").Parse(tmpl)
	if err != nil {
		return "", err
	}

	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}

	return buf.String(), nil
}

func (s *EmailService) sendEmail(to, subject, htmlBody string) error {
	from := s.cfg.Email.FromEmail
	fromName := s.cfg.Email.FromName

	// Build headers
	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", fromName, from)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	var message bytes.Buffer
	for k, v := range headers {
		message.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	message.WriteString("\r\n")
	message.WriteString(htmlBody)

	// Connect to SMTP server
	addr := fmt.Sprintf("%s:%d", s.cfg.Email.SMTPHost, s.cfg.Email.SMTPPort)

	auth := smtp.PlainAuth("", s.cfg.Email.SMTPUsername, s.cfg.Email.SMTPPassword, s.cfg.Email.SMTPHost)

	// TLS config
	tlsConfig := &tls.Config{
		ServerName: s.cfg.Email.SMTPHost,
	}

	// Connect
	conn, err := tls.Dial("tcp", addr, tlsConfig)
	if err != nil {
		// Try non-TLS connection first, then STARTTLS
		log.Printf("[EmailService] TLS dial failed, trying plain connection: %v", err)
		return smtp.SendMail(addr, auth, from, []string{to}, message.Bytes())
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.Email.SMTPHost)
	if err != nil {
		return fmt.Errorf("failed to create SMTP client: %w", err)
	}
	defer client.Close()

	// Auth
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("SMTP auth failed: %w", err)
	}

	// Set sender and recipient
	if err = client.Mail(from); err != nil {
		return fmt.Errorf("SMTP MAIL command failed: %w", err)
	}
	if err = client.Rcpt(to); err != nil {
		return fmt.Errorf("SMTP RCPT command failed: %w", err)
	}

	// Send message body
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("SMTP DATA command failed: %w", err)
	}
	_, err = w.Write(message.Bytes())
	if err != nil {
		return fmt.Errorf("failed to write email body: %w", err)
	}
	err = w.Close()
	if err != nil {
		return fmt.Errorf("failed to close email body writer: %w", err)
	}

	log.Printf("[EmailService] Email sent successfully to %s", to)
	return client.Quit()
}
