# Jenkins CI/CD for BCIM ERP

Repository:

```text
https://github.com/asal1989/BCIM-CONS-ERP.git
```

## Recommended Jenkins Job

Create a Jenkins **Pipeline** job.

Use:

```text
Definition: Pipeline script from SCM
SCM: Git
Repository URL: https://github.com/asal1989/BCIM-CONS-ERP.git
Branch: */main
Script Path: Jenkinsfile
```

## Jenkins Server Requirements

Install these on the Jenkins Windows server:

```bat
node -v
npm -v
pm2 -v
git --version
```

PM2 apps expected by the pipeline:

```text
bcim-backend
bcim-frontend
```

The backend `.env` file must stay on the server in:

```text
construct-erp\backend\.env
```

Do not commit `.env` to GitHub.

## GitHub Webhook

In GitHub repository settings:

```text
Settings > Webhooks > Add webhook
Payload URL: http://YOUR-JENKINS-SERVER:8080/github-webhook/
Content type: application/json
Events: Just the push event
```

In Jenkins job settings, enable:

```text
GitHub hook trigger for GITScm polling
```

## Pipeline Flow

The Jenkinsfile runs:

```text
Checkout
Install backend dependencies
Install frontend dependencies
Backend syntax check
Optional backend tests
Frontend production build
Optional database backup
PM2 reload/restart
```

## Manual First Run

Run the Jenkins job manually once after creating it. If that succeeds, GitHub push webhook can deploy automatically.
