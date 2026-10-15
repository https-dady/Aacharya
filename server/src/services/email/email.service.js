const BREVO_EMAIL_API_URL = 'https://api.brevo.com/v3/smtp/email';

function getBrevoConfiguration() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim()
    || 'Aacharya LMS';

  if (!apiKey || !senderEmail) {
    const error = new Error(
      'Email service is not configured.',
    );

    error.code = 'EMAIL_SERVICE_NOT_CONFIGURED';
    error.statusCode = 503;
    error.expose = true;

    throw error;
  }

  return { apiKey, senderEmail, senderName };
}

function createEmailServiceError(statusCode, message) {
  const error = new Error(message);

  error.code = 'EMAIL_DELIVERY_FAILED';
  error.statusCode = 502;
  error.expose = true;
  error.providerStatus = statusCode;

  return error;
}

async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  textContent,
}) {
  const { apiKey, senderEmail, senderName } =
    getBrevoConfiguration();

  if (
    typeof to !== 'string'
    || !to.trim()
    || typeof subject !== 'string'
    || !subject.trim()
    || typeof htmlContent !== 'string'
    || !htmlContent.trim()
  ) {
    throw new TypeError(
      'A recipient, subject, and HTML email body are required.',
    );
  }

  if (
    textContent !== undefined
    && typeof textContent !== 'string'
  ) {
    throw new TypeError(
      'Email text content must be a string when provided.',
    );
  }

  let response;

  try {
    response = await fetch(BREVO_EMAIL_API_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [{ email: to.trim() }],
        subject: subject.trim(),
        htmlContent,
        ...(textContent !== undefined
          ? { textContent }
          : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw createEmailServiceError(
      502,
      'The email provider could not be reached.',
    );
  }

  if (!response.ok) {
    throw createEmailServiceError(
      response.status,
      'The email provider rejected the email request.',
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw createEmailServiceError(
      response.status,
      'The email provider returned an invalid response.',
    );
  }

  return {
    messageId:
      typeof result.messageId === 'string'
        ? result.messageId
        : null,
  };
}

/*
 * Mutable method allows tests to replace the email sender without
 * making an actual network request to Brevo.
 */
export const emailClient = {
  sendTransactionalEmail,
};

/*
 * Preserve the existing named export so current application
 * imports continue to work.
 */
export { sendTransactionalEmail };