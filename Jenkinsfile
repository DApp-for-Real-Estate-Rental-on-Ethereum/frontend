pipeline {
    agent any

    tools {
        nodejs 'NodeJS-22'  // Must match the name configured in Jenkins Tools (Next.js with @types/node ^22)
    }

    parameters {
        string(name: 'GATEWAY_URL', defaultValue: 'http://192.168.49.2:30090', description: 'API Gateway URL (Minikube IP or AWS LoadBalancer)')
        string(name: 'API_BASE_URL', defaultValue: 'http://192.168.49.2:30090', description: 'Base API URL')
        booleanParam(name: 'USE_GATEWAY', defaultValue: true, description: 'Use Gateway for all requests')
    }

    environment {
        DOCKER_IMAGE_NAME = 'medgm/real-estate-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    sh 'git rev-parse --short HEAD'
                }
            }
        }

        stage('Verify Project Layout') {
            steps {
                script {
                    sh '''
                        echo "Verifying frontend repository layout..."
                        echo "Node version: $(node --version)"
                        echo "NPM version: $(npm --version)"
                        pwd
                        ls -la
                        if [ ! -f package.json ]; then
                            echo "ERROR: package.json not found!"
                            ls -la
                            exit 1
                        fi
                        echo "package.json found."
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    sh '''
                        echo "Installing Node.js dependencies..."
                        npm ci || npm install
                    '''
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    sh '''
                        echo "Running ESLint..."
                        npm run lint || true
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh '''
                        echo "Building Next.js application..."
                        npm run build
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    sh """
                        echo "Building Docker image for Frontend..."
                        docker build \\
                            --build-arg NEXT_PUBLIC_GATEWAY_URL=${params.GATEWAY_URL} \\
                            --build-arg NEXT_PUBLIC_API_BASE_URL=${params.API_BASE_URL} \\
                            --build-arg NEXT_PUBLIC_USE_GATEWAY=${params.USE_GATEWAY} \\
                            -t ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} .
                        docker tag ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} ${DOCKER_IMAGE_NAME}:latest
                        GIT_COMMIT_SHORT=\$(git rev-parse --short HEAD)
                        docker tag ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} ${DOCKER_IMAGE_NAME}:\${GIT_COMMIT_SHORT}
                        echo "Docker images created:"
                        docker images | grep ${DOCKER_IMAGE_NAME}
                    """
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                script {
                    withCredentials([usernamePassword(credentialsId: 'docker-registry-creds', usernameVariable: 'DOCKER_USERNAME', passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh """
                            echo "Logging into Docker Hub..."
                            echo \$DOCKER_PASSWORD | docker login -u \$DOCKER_USERNAME --password-stdin

                            GIT_COMMIT_SHORT=\$(git rev-parse --short HEAD)
                            echo "Pushing images to Docker Hub..."
                            docker push ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER}
                            docker push ${DOCKER_IMAGE_NAME}:latest
                            docker push ${DOCKER_IMAGE_NAME}:\${GIT_COMMIT_SHORT}
                        """
                    }
                }
            }
        }

        stage('Deploy to Local Registry') {
            steps {
                script {
                    sh """
                        echo "Tagging and pushing to local registry..."
                        docker tag ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} localhost:5000/real-estate-frontend:${BUILD_NUMBER}
                        docker tag ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} localhost:5000/real-estate-frontend:latest

                        docker push localhost:5000/real-estate-frontend:${BUILD_NUMBER}
                        docker push localhost:5000/real-estate-frontend:latest

                        echo "Images in local registry:"
                        docker images | grep real-estate-frontend
                    """
                }
            }
        }
    }

    post {
        always {
            script {
                sh """
                    echo "Cleaning up local Docker tags..."
                    docker rmi ${DOCKER_IMAGE_NAME}:${BUILD_NUMBER} || true
                    docker rmi ${DOCKER_IMAGE_NAME}:latest || true
                    docker rmi localhost:5000/real-estate-frontend:${BUILD_NUMBER} || true
                """
            }
            // Clean workspace
            deleteDir()
        }
        success {
            echo "Frontend pipeline completed successfully! 🎉"
        }
        failure {
            echo "Frontend pipeline failed. ❌"
        }
    }
}
