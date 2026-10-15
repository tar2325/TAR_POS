# Multi-stage Docker build for Spring Boot Backend (Root Context)
FROM maven:3.9.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Cache dependencies
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B || true

# Copy source code and build production jar
COPY backend/src src
RUN mvn clean package -DskipTests

# Runtime image
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN addgroup -S posgroup && adduser -S posuser -G posgroup
USER posuser

COPY --from=build /app/target/*.jar app.jar

ENV PORT=8080
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080

ENTRYPOINT ["java", "-Xmx320m", "-XX:+UseSerialGC", "-Xss512k", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
