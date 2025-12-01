import { APIRequestContext } from '@playwright/test';


export class JiraClient {
  private request: APIRequestContext;
  private baseUrl: string;
  private authHeader: { Authorization: string };

  constructor(request: APIRequestContext) {
    this.request = request;
    this.baseUrl = process.env.JIRA_BASE_URL!;
    const token = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    this.authHeader = { Authorization: `Basic ${token}` };
  }

  private printCurl(method: string, url: string, body?: any) {
  const lines = [
    `curl -X ${method} "${url}"`,
    `-H "Authorization: ${this.authHeader.Authorization}"`,
    `-H "Accept: application/json"`
  ];

  if (body) {
    lines.push(`-H "Content-Type: application/json"`);
    lines.push(`--data '${JSON.stringify(body, null, 2)}'`);
  }

  console.log("\n======= DEBUG CURL REQUEST =======\n");
  console.log(lines.join(" \\\n"));
  console.log("\n=================================\n");
}

  async getMyself() {
    const url = `${this.baseUrl}/rest/api/3/myself`;

    this.printCurl("GET",url);

    const response = await this.request.get(url, {
      headers: {
        ...this.authHeader,
        Accept: 'application/json',
      },
    });
    return response;
  }

  async getFilter(filterId: string) {

    const url = `${this.baseUrl}/rest/api/3/filter/${filterId}`;

    this.printCurl("GET",url);

    return this.request.get(url, {
      headers: { ...this.authHeader, Accept: 'application/json' },
    });
  }

//  async searchJQL(jql: string, fields: string[], nextPageToken?: string, maxResults = 100) {
//   const body: any = { jql, fields, maxResults };
//   if (nextPageToken) {
//     body.nextPageToken = nextPageToken;
//   }

//   const response = await this.request.post(`${this.baseUrl}/rest/api/3/search/jql`, {
//     headers: {
//       ...this.authHeader,
//       'Content-Type': 'application/json',
//       Accept: 'application/json',
//     },
//     data: body,
//   });

//   return response;
// }

// async getAllIssues(jql: string, fields: string[]) {
//   let issues: any[] = [];
//   let nextPageToken: string | undefined;

//   do {
//     const response = await this.searchJQL(jql, fields, nextPageToken);
//     if (!response.ok()) {
//       throw new Error(`Failed to fetch issues: ${response.status()} ${response.statusText()}`);
//     }

//     const data = await response.json();
//     issues = issues.concat(data.issues);
//     nextPageToken = data.nextPageToken;
//   } while (nextPageToken);

//   return issues;
// }



async searchJQL(jql: string, fields: string[], nextPageToken?: string, maxResults = 100) {
  const body: any = { jql, fields, maxResults };
  if (nextPageToken) body.nextPageToken = nextPageToken;

  const url = `${this.baseUrl}/rest/api/3/search/jql`;

  // 🔥 Выводим cURL прямо здесь
    this.printCurl('POST', url, body);

  const response = await this.request.post(url, {
    headers: {
      ...this.authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: body,
  });

  return response;
}

async getAllIssues(jql: string, fields: string[]) {
    let allIssues: any[] = [];
    let nextPageToken: string | undefined = undefined;
    let isLast = false;

    while (!isLast) {
      const response = await this.searchJQL(jql, fields, nextPageToken);

      if (!response.ok()) {
        throw new Error(`Failed to fetch issues: ${response.status()} ${response.statusText()}`);
      }

      const data = await response.json();

      allIssues.push(...data.issues);

      nextPageToken = data.nextPageToken;
      isLast = data.isLast === true;
    }

    return allIssues;
  }


}