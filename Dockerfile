FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server


FROM alpine:3.19

WORKDIR /app

RUN adduser -D -u 1001 appuser

COPY --from=builder /app/server .

EXPOSE 5000

USER appuser

CMD ["./server"]

