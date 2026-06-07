pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    booleanParam(name: 'RUN_DB_BACKUP', defaultValue: true, description: 'Take PostgreSQL backup before deployment')
    booleanParam(name: 'RUN_BACKEND_TESTS', defaultValue: false, description: 'Run backend Jest tests')
    booleanParam(name: 'DEPLOY_PM2', defaultValue: true, description: 'Restart PM2 services after successful build')
  }

  environment {
    APP_DIR = 'construct-erp'
    NODE_ENV = 'development'
    NPM_CONFIG_PRODUCTION = 'false'
    PM2_BACKEND = 'bcim-backend'
    PM2_FRONTEND = 'bcim-frontend'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Backend') {
      steps {
        dir("${env.APP_DIR}/backend") {
          bat 'npm ci --include=dev'
        }
      }
    }

    stage('Install Frontend') {
      steps {
        dir("${env.APP_DIR}/frontend") {
          bat 'npm ci --include=dev'
        }
      }
    }

    stage('Backend Syntax Check') {
      steps {
        dir("${env.APP_DIR}/backend") {
          bat 'node --check src/server.js'
        }
      }
    }

    stage('Backend Tests') {
      when {
        expression { return params.RUN_BACKEND_TESTS }
      }
      steps {
        dir("${env.APP_DIR}/backend") {
          bat 'npm test -- --runInBand'
        }
      }
    }

    stage('Build Frontend') {
      steps {
        dir("${env.APP_DIR}/frontend") {
          bat 'set NODE_ENV=production&& npm run build'
        }
      }
    }

    stage('Database Backup') {
      when {
        expression { return params.RUN_DB_BACKUP }
      }
      steps {
        dir("${env.APP_DIR}/backend") {
          bat 'npm run backup'
        }
      }
    }

    stage('Deploy With PM2') {
      when {
        allOf {
          branch 'main'
          expression { return params.DEPLOY_PM2 }
        }
      }
      steps {
        dir("${env.APP_DIR}") {
          bat 'pm2 startOrReload ecosystem.config.cjs --update-env'
          bat 'pm2 restart %PM2_BACKEND% --update-env'
          bat 'pm2 restart %PM2_FRONTEND% --update-env'
          bat 'pm2 save'
        }
      }
    }
  }

  post {
    success {
      echo 'BCIM ERP CI/CD completed successfully.'
    }
    failure {
      echo 'BCIM ERP CI/CD failed. Check the Jenkins stage log above.'
    }
  }
}
