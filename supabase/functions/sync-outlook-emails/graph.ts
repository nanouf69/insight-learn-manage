export interface EmailMessage {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: { content: string; contentType: string };
  from?: { emailAddress: { address: string; name: string } };
  toRecipients?: { emailAddress: { address: string; name: string } }[];
  hasAttachments: boolean;
  isRead: boolean;
  receivedDateTime: string;
  sentDateTime?: string;
}

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

const SELECT_FIELDS =
  "id,subject,bodyPreview,body,from,toRecipients,hasAttachments,isRead,receivedDateTime,sentDateTime";

/** Read recent mail globally, or only one person's mail through Graph search. */
export async function fetchEmails(
  accessToken: string,
  userEmail: string,
  folder: "inbox" | "sentItems",
  matchEmail?: string,
  fetchImpl: FetchLike = fetch,
  requestTimeoutMs = 20_000,
): Promise<EmailMessage[]> {
  const targeted = Boolean(matchEmail?.trim());
  const pageSize = targeted ? 100 : 200;
  const maxPages = targeted ? 2 : 1;
  const orderBy = folder === "sentItems"
    ? "sentDateTime desc"
    : "receivedDateTime desc";

  const params = new URLSearchParams({
    $top: String(pageSize),
    $select: SELECT_FIELDS,
  });
  if (targeted) {
    // Graph search avoids downloading thousands of unrelated full bodies.
    // $orderby is intentionally absent: Graph rejects it with $search.
    const field = folder === "inbox" ? "from" : "to";
    params.set("$search", `"${field}:${matchEmail!.trim()}"`);
  } else {
    params.set("$orderby", orderBy);
  }

  const collected: EmailMessage[] = [];
  let url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/mailFolders/${folder}/messages?${params}`;

  for (let page = 0; page < maxPages && url; page++) {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(targeted ? { ConsistencyLevel: "eventual" } : {}),
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new Error(`Lecture Outlook ${folder} : délai dépassé`);
      }
      throw error;
    }

    if (!response.ok) {
      console.error(`Error fetching ${folder}: HTTP ${response.status}`);
      throw new Error(`Lecture Outlook ${folder} impossible (HTTP ${response.status})`);
    }

    const data = await response.json();
    collected.push(...(data.value || []));
    url = data["@odata.nextLink"] || "";
  }

  if (!targeted) return collected;

  const needle = matchEmail!.trim().toLowerCase();
  return collected.filter((email) => {
    const from = email.from?.emailAddress?.address?.toLowerCase();
    if (from === needle) return true;
    return (email.toRecipients || []).some(
      (recipient) => recipient?.emailAddress?.address?.toLowerCase() === needle,
    );
  });
}
