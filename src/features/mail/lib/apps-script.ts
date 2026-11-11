/**
 * The Google Apps Script the user pastes into script.google.com (ADR 017). It runs in their own
 * Google account, so no Google app verification is needed. The token is not part of the code:
 * the user saves it as the script property HUNTBOARD_TOKEN.
 */
export function appsScript(baseUrl: string): string {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/mail/messages`;
  return `/**
 * Huntboard: przenosi maile rekrutacyjne na tablicę.
 * 1. Ustawienia projektu > Właściwości skryptu: HUNTBOARD_TOKEN = token z profilu Huntboard.
 * 2. Uruchom raz funkcję setup(): włączy synchronizację co godzinę i przejrzy ostatnie 30 dni.
 * Do Huntboard trafiają tylko maile pasujące do QUERY; reszta skrzynki zostaje w Gmailu.
 */
const HUNTBOARD_URL = "${url}";
const QUERY =
  "-in:sent -in:chats -from:me (from:justjoin.it OR from:nofluffjobs.com OR from:erecruiter.pl " +
  "OR subject:(aplikacja OR aplikację OR aplikacji OR rekrutacja OR rekrutacji OR zgłoszenie " +
  "OR stanowisko OR rozmowa OR rozmowę OR application OR interview OR offer))";
const BATCH = 20;

function syncHuntboard() {
  send_(collect_(3));
}

function setup() {
  ScriptApp.getProjectTriggers().forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("syncHuntboard").timeBased().everyHours(1).create();
  send_(collect_(30));
}

function collect_(days) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const messages = [];
  GmailApp.search("newer_than:" + days + "d " + QUERY, 0, 100).forEach((thread) => {
    thread.getMessages().forEach((message) => {
      if (message.getDate() < since) return;
      messages.push({
        messageId: message.getId(),
        from: message.getFrom(),
        subject: message.getSubject(),
        date: message.getDate().toISOString(),
        body: message.getPlainBody().slice(0, 6000),
      });
    });
  });
  return messages;
}

function send_(messages) {
  const token = PropertiesService.getScriptProperties().getProperty("HUNTBOARD_TOKEN");
  if (!token) throw new Error("Brak HUNTBOARD_TOKEN we właściwościach skryptu.");
  for (let i = 0; i < messages.length; i += BATCH) {
    const response = UrlFetchApp.fetch(HUNTBOARD_URL, {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + token },
      payload: JSON.stringify({ messages: messages.slice(i, i + BATCH) }),
      muteHttpExceptions: true,
    });
    console.log(response.getResponseCode() + " " + response.getContentText());
    if (response.getResponseCode() === 401) throw new Error("Huntboard nie przyjął tokenu.");
  }
}
`;
}
