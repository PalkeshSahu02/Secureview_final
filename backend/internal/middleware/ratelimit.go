package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimiter implements a token bucket rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int           // requests per window
	window   time.Duration // time window
}

type visitor struct {
	tokens    int
	lastSeen  time.Time
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		rate:     rate,
		window:   window,
	}

	// Start cleanup goroutine
	go rl.cleanup()

	return rl
}

// cleanup removes old visitors periodically
func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			if time.Since(v.lastSeen) > rl.window*2 {
				delete(rl.visitors, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// Allow checks if a request is allowed for the given IP
func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	now := time.Now()

	if !exists {
		rl.visitors[ip] = &visitor{
			tokens:   rl.rate - 1,
			lastSeen: now,
		}
		return true
	}

	// Refill tokens based on time passed
	elapsed := now.Sub(v.lastSeen)
	tokensToAdd := int(float64(elapsed) / float64(rl.window) * float64(rl.rate))
	v.tokens = min(rl.rate, v.tokens+tokensToAdd)
	v.lastSeen = now

	if v.tokens > 0 {
		v.tokens--
		return true
	}

	return false
}

// Remaining returns the number of remaining requests for an IP
func (rl *RateLimiter) Remaining(ip string) int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists {
		return rl.rate
	}
	return v.tokens
}

// RateLimitMiddleware creates a rate limiting middleware
func RateLimitMiddleware(limiter *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		if !limiter.Allow(ip) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":   "rate_limit_exceeded",
				"message": "Too many requests. Please try again later.",
			})
			return
		}

		// Add rate limit headers
		c.Header("X-RateLimit-Limit", string(rune(limiter.rate)))
		c.Header("X-RateLimit-Remaining", string(rune(limiter.Remaining(ip))))

		c.Next()
	}
}

// StrictRateLimitMiddleware creates a stricter rate limiter for sensitive endpoints
func StrictRateLimitMiddleware(requestsPerMinute int) gin.HandlerFunc {
	limiter := NewRateLimiter(requestsPerMinute, time.Minute)
	return RateLimitMiddleware(limiter)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
