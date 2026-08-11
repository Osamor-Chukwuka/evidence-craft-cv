# Code Chronicle

Build a fully functional MVP web application for a developer career/CV assistant.

Core idea

The application helps software developers recover and document meaningful engineering work they have done across Git repositories, then use that evidence to strengthen or build their CV.

A developer should be able to connect their GitHub account, select repositories, choose a date range, sync their contributions, and have the app analyze their actual work into meaningful engineering achievements.

The app should then compare those achievements against the user's existing CV if they uploaded one.

If an existing CV contains vague descriptions that correspond to work discovered from GitHub, the app should suggest stronger, more detailed replacements based on the available evidence.

If the app discovers meaningful work that is not represented in the CV, it should suggest adding it as a new bullet or project entry.

Every suggested CV change must require explicit user approval before being applied.

If the user does not upload an existing CV, create and maintain an internal structured CV for them.

Technology stack

Use:

Next.js with TypeScript

Supabase

Tailwind CSS

Use the current recommended stable patterns for Next.js.

Use Supabase for:

authentication/session storage where appropriate

PostgreSQL database

secure persistence

user data

repository connections

sync history

analyzed work items

CV data

user approvals/rejections

Use TypeScript throughout the entire project.

Do not build a static mockup.

The application should be functionally wired end-to-end wherever credentials and external APIs are available.

If a required external API, AI model, OAuth credential, secret, environment variable, or configuration is missing, ask me for it instead of faking the functionality.

Do not silently substitute dummy data for missing integrations.

Important development approach

Before making assumptions about important product behavior, ask me questions.

If there are implementation decisions that materially affect the app, security, GitHub permissions, AI provider, CV parsing, or deployment, ask me before choosing arbitrarily.

Break the application into small, reusable, maintainable components.

Avoid giant components.

Separate:

UI

data access

business logic

external API integrations

AI analysis

CV comparison logic

repository synchronization

Use clean TypeScript types/interfaces for the application's core entities.

Authentication

Users need accounts.

Support normal application authentication through Supabase.

Also allow users to connect their GitHub account.

Prefer GitHub OAuth or a GitHub App flow rather than asking normal users to paste a personal access token.

The GitHub connection should use the minimum permissions needed to inspect repositories and contribution data.

Users should be able to disconnect GitHub later.

Design the integration so other providers such as GitLab and Bitbucket can be added later, but do not implement them yet unless required by the architecture.

For the MVP, GitHub is the only source-control provider.

Onboarding flow

After signup/login, guide the user through onboarding.

The onboarding should roughly be:

Welcome / explanation of what the application does.

Connect GitHub.

Select repositories.

Choose analysis period.

Optionally upload existing CV.

Run initial analysis.

Show discovered work.

The user should not be forced to upload a CV.

Explain that uploading an existing CV allows the application to strengthen and update what they already have rather than generating a completely new CV.

Repository selection

After connecting GitHub, retrieve repositories the authenticated user has access to.

Allow the user to select:

one repository

several repositories

all repositories

Store the selection.

The user should later be able to change repository selections from settings.

Date filtering

The user needs control over how much history is inspected.

For the first analysis, provide options similar to:

all time

last 12 months

last 6 months

from a specific date

custom date range if useful

After a successful sync, remember the last successful synchronization point.

On future syncs, default to inspecting only contributions since the previous sync.

However, allow the user to manually choose another starting date or date range.

Internally distinguish between:

repository synchronization cursor

analysis date range

These are not necessarily the same.

The application should not repeatedly reprocess years of repository history unless the user explicitly requests it.

GitHub synchronization

Provide a manual "Sync" or "Check for new work" action.

For the MVP, do not require automatic background synchronization.

When the user clicks sync:

determine the selected repositories

determine the selected date range

retrieve the user's relevant contributions

store raw or normalized contribution metadata

identify which contributions belong to the user

group related activity together

analyze each group as a meaningful piece of engineering work

save the resulting structured work items

update the sync history

Show useful progress/status while synchronization is happening.

Handle failures gracefully.

Do not lose already processed data if one repository fails.

Contributions to inspect

Do more than count commits.

Where available through GitHub APIs, inspect relevant information such as:

commits authored by the user

pull requests created by the user

merged pull requests

pull request descriptions

pull request comments

pull request reviews

linked issues

issue descriptions

changed files

code diffs where feasible

tests added or modified

configuration changes

database migrations

infrastructure changes

repository languages

relevant documentation

merge dates

relationships between commits, PRs and issues

Do not treat commit count or lines of code as a direct measure of impact.

Contribution clustering

This is one of the most important product behaviors.

The application should not show every commit independently.

Related commits, pull requests, issues and files should be grouped into meaningful "Work Items".

Example:

Several commits such as:

add webhook event table

prevent duplicate event processing

add unique constraint

add retry job

handle timeout

add retry tests

could be grouped into one Work Item such as:

"Payment webhook reliability"

The clustering system should use signals such as:

time proximity

pull request relationships

linked issues

similar files/components

branch names

commit messages

code context

repository structure

semantic similarity

Keep the clustering logic separate from the UI.

Work Item data model

Create a structured model for discovered engineering work.

A Work Item should support fields such as:

id

user id

repository id

title

summary

start date

end date

technologies

components/modules

technical details

architecture decisions

algorithms

patterns

data structures where relevant

commits

pull requests

issues

evidence references

possible impact

confidence level

user-provided context

CV candidate status

created date

updated date

Do not make generated prose the only source of truth.

Store the underlying evidence and structured metadata.

Accuracy rules

The application must distinguish between:

verified information

strongly inferred information

user-confirmed information

unknown/unverified information

Do not invent metrics.

For example, if the repository proves that Redis caching was introduced but does not prove a 40% latency reduction, do not generate "reduced latency by 40%".

Instead say something like:

"Introduced Redis caching for frequently accessed data to improve request performance."

Then optionally ask the user if they know the measurable impact.

Never fabricate:

performance percentages

revenue impact

user counts

cost savings

leadership responsibility

production results

unless they are supported by evidence or confirmed by the user.

Work history dashboard

Create a dashboard where the user can review reconstructed work.

The dashboard should provide:

repository filtering

date filtering

sync status

last sync information

discovered Work Items

search/filtering

confidence/evidence indicators

CV candidate status

Each Work Item should be inspectable.

The user should be able to see why the app concluded that the work happened.

Provide access to supporting evidence such as:

commits

pull requests

issues

changed modules/files

tests

The user should also be able to:

edit the title

edit the summary

add missing context

mark something as incorrect

archive routine work

mark something as CV-worthy

turn it into a CV suggestion

CV upload

Uploading an existing CV is optional.

Support at least:

PDF

DOCX

If practical and reliable within the selected implementation approach, parse the uploaded CV into structured sections.

At minimum identify:

name/contact information

summary

skills

employment history

roles

employment dates

experience bullets

projects

education

certifications where available

Store the structured representation in the database.

Preserve the original uploaded CV as a source/reference.

Do not modify the user's original file directly.

CV comparison

After repository analysis, compare discovered Work Items against the user's existing CV.

Try to identify:

work already represented accurately

work represented vaguely

discovered work missing from the CV

potentially duplicated CV bullets

work that is probably too routine to include

Example:

Existing CV bullet:

"Worked on payment processing systems."

GitHub evidence:

The user designed and implemented idempotent webhook processing, retries, duplicate prevention and reconciliation.

The application should propose:

CURRENT:
"Worked on payment processing systems."

SUGGESTED:
"Designed and implemented idempotent payment webhook processing with retry handling, duplicate-event prevention and failure reconciliation."

The application must not make the change automatically.

Show an approval flow such as:

Replace

Edit suggestion

Keep existing

Dismiss

New CV additions

When a discovered Work Item does not match anything in the CV, the app can recommend adding it.

Allow the user to choose where it belongs:

under an existing role

under projects

another appropriate section

Generate CV-ready bullets using the evidence.

Allow the user to edit them before approving.

Do not add everything automatically.

CV candidate classification

The system should be able to classify Work Items roughly as:

strong CV candidate

possible CV candidate

routine / low-value for CV

This is only guidance.

Users must be able to override it.

Examples of routine work might include:

dependency bumps

minor formatting fixes

trivial configuration adjustments

Do not treat every commit as CV-worthy.

Internal CV

If the user does not upload an existing CV, create an internal structured CV.

The internal CV should allow the user to maintain:

basic personal details

professional summary

skills

work experience

roles

dates

bullets

projects

education

certifications

Work Items can then be added to this CV after user approval.

Design the data model so multiple CV versions can eventually be supported, even if the MVP initially exposes only one.

For example, later the user might have:

Backend Engineer CV

Senior Software Engineer CV

Engineering Lead CV

All should eventually be able to use the same underlying career evidence.

CV update flow

The desired user flow is:

GitHub Sync
→ Discover Work Items
→ User reviews them
→ Compare against CV
→ Identify vague or missing CV entries
→ Generate evidence-backed suggestions
→ User approves/rejects/edits
→ Internal CV is updated

The application should clearly separate:

evidence

AI suggestion

final user-approved CV content

CV exports

If feasible within the MVP, allow exporting the internal CV.

Preferred formats:

DOCX

PDF

If reliable export would significantly complicate the initial build, implement the structured CV and update workflow first and tell me what remains before pretending export is complete.

AI analysis architecture

Create an abstraction for AI analysis rather than placing model calls throughout UI components.

Have separate services/functions for things such as:

contribution clustering

Work Item generation

technical detail extraction

CV relevance classification

CV comparison

bullet generation

vague bullet detection

Use structured outputs where possible.

Validate AI responses before saving them.

Preserve evidence references used to support generated claims.

Before wiring the AI provider, ask me which provider/model I want to use if this has not been specified.

Do not hard-code an AI provider without discussing it with me.

Database

Design a proper relational schema in Supabase.

Likely entities include:

users/profiles

source control connections

repositories

repository selections

sync runs

contribution events

work items

work item evidence

CV documents

CV versions

CV sections

experience entries

CV bullets

CV suggestions

user approvals/rejections

uploaded files

You do not have to use these exact table names if there is a better normalized schema.

Use foreign keys, indexes and constraints appropriately.

Use Supabase Row Level Security.

A user must never be able to access another user's repositories, work items, CV or files.

Security

Treat source code and CV data as sensitive.

Follow secure practices for:

OAuth tokens

Supabase secrets

API keys

uploaded files

private repository data

Do not expose GitHub tokens or service credentials to the browser.

Use server-side routes/actions where appropriate.

Store sensitive credentials securely.

Do not log secrets, source code contents or full CV contents unnecessarily.

Use the least-privilege principle.

Settings

Provide settings for things such as:

GitHub connection

connected repositories

repository selection

CV upload/change

sync defaults

account information

Allow users to disconnect a GitHub connection safely.

Application structure

Break the implementation into logical modules.

Possible structure:

authentication

onboarding

GitHub integration

repository management

synchronization

contribution normalization

contribution clustering

AI analysis

work history

CV parsing

CV comparison

CV suggestions

CV editor

settings

Use reusable UI components where appropriate.

Keep server-side/business logic out of presentation components.

Error/loading/empty states

Build real states for:

no GitHub connection

no repositories

no contributions in selected period

analysis currently running

partial repository sync failure

expired GitHub authorization

CV not uploaded

CV parsing failure

no CV-worthy work discovered

first-time empty dashboard

Do not leave screens blank.

User control

Users should remain in control of their data.

Provide obvious ways to:

remove a repository

disconnect GitHub

delete an uploaded CV

reject AI suggestions

edit Work Items

delete/archive reconstructed work

re-run analysis

change date ranges

MVP priority order

Build the project in stages.

Prioritize this sequence:

Project setup

Supabase authentication

Database schema and RLS

GitHub OAuth connection

Repository listing/selection

Date-range selection

GitHub contribution ingestion

Contribution normalization

Work Item clustering

AI analysis

Work history dashboard

Optional CV upload/parsing

CV comparison

Suggested replacements/new bullets

Approval/edit/rejection workflow

Internal CV

Export if reliable

Settings and cleanup

Do not attempt to implement everything inside a single huge component or page.

Complete and test each major layer before depending heavily on the next.

Functional requirement

This should be a real working application.

Do not create fake repository results just to make the UI appear finished.

Do not simulate synchronization if GitHub is not connected.

Do not return hard-coded AI analysis pretending it came from repository data.

If credentials or configuration are required, stop at the appropriate point and ask me for what you need.

Questions for me

Before implementing anything where the answer is not obvious, ask me.

In particular, clarify things such as:

AI provider/model

GitHub OAuth App vs GitHub App if necessary

deployment target if it materially changes implementation

CV parsing approach if there are meaningful tradeoffs

whether private repositories must be supported immediately

any required environment credentials

anything else that blocks a secure, production-like implementation

Do not ask unnecessary questions when a reasonable implementation choice is obvious.

Final goal

The key MVP experience should feel like this:

A developer signs in.

They connect GitHub.

They select repositories and a period.

They click Sync.

The system reconstructs meaningful engineering work they performed.

The developer sees work they may have forgotten about.

If they uploaded a CV, the app finds vague/missing descriptions and proposes stronger evidence-backed changes.

If they did not upload a CV, the app maintains an internal CV for them.

The developer reviews every suggested CV change before it is applied.

The core product value is not simply generating a resume.

It is reconstructing a trustworthy, evidence-backed record of the developer's engineering work and using it to improve their CV.


Use:

Primary: Gemini 3.6 Flash 
Fallback: OpenAI model
Last fallback: Gemini 2.5 Flash

But only fall back for things like provider outage, rate limit, unavailable model, or request/token limits. If Gemini returns a bad/invalid structured response, retry once before switching providers.

And if an API key is missing, just skip that provider automatically.


read this as the product specification, ask any architecture/credential questions if you have. If you don't have any and you're ready to buil, say you're ready then I can give you the go ahead

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1c42660e-53aa-47d6-9b24-7301c4f1886e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
