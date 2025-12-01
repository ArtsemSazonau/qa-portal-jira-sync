import { test, expect } from '@playwright/test';
import { JiraClient } from '../helpers/jiraClient';
import { jiraData } from '../data/jiraData';


let jiraUser: any;
let filterJQL: string;
let allIssues: any [] = [];




test.describe.configure({ mode: 'serial' });


test('authorizes in Jira', async ({ request }) => {
    
    console.log("Step 1: authorizes in Jira");

    const jiraClient = new JiraClient(request);
    const jiraEmail: string = process.env.JIRA_EMAIL!;
    const response = await jiraClient.getMyself();
    expect(response.ok()).toBeTruthy();
    jiraUser = await response.json();

    console.log('✅ Jira user:', jiraUser.emailAddress);

    expect(jiraUser.emailAddress).toEqual(jiraEmail);
  
});

test('retrieves JQL from Jira filter', async ({ request }) => {

    console.log("Step 2: retrieves JQL from Jira filter");

    const jiraClient = new JiraClient(request);
    const filterId = jiraData.allBugsFilter;
    const response = await jiraClient.getFilter(filterId);

    expect(response.ok()).toBeTruthy();

    const filter = await response.json();
    filterJQL = filter.jql;

    console.log('✅ JQL retrieved:', filterJQL);
    expect(filterJQL).toBeTruthy();

});

test('fetches all issues from Jira', async ({ request }) => {

    console.log("Step 3: fetches all issues from Jira");
    
    const jiraClient = new JiraClient(request);
    // JQL берём из предыдущего теста, но можно и напрямую
    const jql = filterJQL;
    const fields = [jiraData.customFields.platform, jiraData.customFields.priority];

    allIssues = await jiraClient.getAllIssues(jql, fields);

      console.log(`✅ Retrieved ${allIssues.length} issues`);
    expect(allIssues.length).toBeGreaterThan(0);

    // Пример проверки: каждая issue должна содержать priority
    for (const issue of allIssues) {
        expect(issue.fields.priority).toBeTruthy();
    }
});

test.skip('counts bugs grouped by platform', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});

test.skip('authorizes in QA-Portal', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});

test.skip('retrieves available projects from QA-Portal', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});

test.skip('syncs grouped bug data to QA-Portal', async ({ request }) => {
    await request.goto('/');
    await expect(request).toHaveURL('https://playwright.dev/docs/intro');
});