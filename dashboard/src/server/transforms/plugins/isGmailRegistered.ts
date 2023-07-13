import axios from "axios";

export async function isGmailRegistered(email: string): Promise<boolean> {
  try {
    const response = await axios.get("https://mail.google.com/mail/gxlu", {
      params: { email: email },
    });
    return response.headers.hasOwnProperty("set-cookie");
  } catch (error) {
    console.error(error);
    return false;
  }
}
