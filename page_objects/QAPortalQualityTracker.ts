import { expect, Page, Locator } from "@playwright/test";

export class QAPortalQualityTracker {

    page: Page;
    loginField: Locator;
    passwordField: Locator;
    logInButton: Locator;
    projectSizeMedium: Locator;
    fieldBlocker: Locator;
    fieldCritical: Locator;
    fieldMajor: Locator;
    fieldMinor: Locator;
    fieldTrivial: Locator;
    saveResultLink: Locator;
    projectsDropdown: Locator;
    logOutButton: Locator;

    constructor(page: Page) {
        this.page = page;
        this.loginField = page.getByRole('textbox', { name: 'Login' });
        this.passwordField = page.getByRole('textbox', { name: 'Password' });
        this.logInButton = page.getByRole('button', { name: 'Log in' })
        this.projectSizeMedium = page.locator('#project-size-medium');
        this.fieldBlocker = page.getByRole('spinbutton', { name: 'Blocker Critical Major Minor' });
        this.fieldCritical = page.locator('#critical');
        this.fieldMajor = page.locator('#major');
        this.fieldMinor = page.locator('#minor');
        this.fieldTrivial = page.locator('#trivial');
        this.saveResultLink = page.getByRole('link', { name: 'Save the result to \'Quality' });
        this.projectsDropdown = page.getByRole('combobox');
        this.logOutButton = page.getByRole('button', { name: 'Log out' });



    };

    visit = async (): Promise<void> => {
        await this.page.goto("https://qa-portal.oxagile.com/qa-tracker/calculator");
    };

    login = async (loginName: string, password: string): Promise<void> => {
        await this.loginField.waitFor();
        await this.loginField.fill(loginName);
        await this.passwordField.waitFor();
        await this.passwordField.fill(password);
        await this.logInButton.click();
    };

}