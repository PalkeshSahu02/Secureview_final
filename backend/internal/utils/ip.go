package utils

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

// IPInfo contains geolocation information for an IP address
type IPInfo struct {
	IP          string  `json:"ip"`
	City        string  `json:"city"`
	Region      string  `json:"region"`
	Country     string  `json:"country"`
	CountryCode string  `json:"country_code"`
	Timezone    string  `json:"timezone"`
	ISP         string  `json:"isp"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
}

// GetClientIP extracts the real client IP from a request
func GetClientIP(r *http.Request) string {
	// Check X-Forwarded-For header (standard for proxies)
	xff := r.Header.Get("X-Forwarded-For")
	if xff != "" {
		// X-Forwarded-For can contain multiple IPs, the first one is the client
		ips := strings.Split(xff, ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header (used by some proxies like Nginx)
	xri := r.Header.Get("X-Real-IP")
	if xri != "" && net.ParseIP(xri) != nil {
		return xri
	}

	// Check CF-Connecting-IP header (Cloudflare)
	cfip := r.Header.Get("CF-Connecting-IP")
	if cfip != "" && net.ParseIP(cfip) != nil {
		return cfip
	}

	// Fall back to RemoteAddr
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

// GetClientIPFromGin extracts the real client IP from Gin context
func GetClientIPFromGin(clientIP string, headers map[string][]string) string {
	// Check X-Forwarded-For header
	if xff, ok := headers["X-Forwarded-For"]; ok && len(xff) > 0 {
		ips := strings.Split(xff[0], ",")
		if len(ips) > 0 {
			ip := strings.TrimSpace(ips[0])
			if net.ParseIP(ip) != nil {
				return ip
			}
		}
	}

	// Check X-Real-IP header
	if xri, ok := headers["X-Real-Ip"]; ok && len(xri) > 0 {
		if net.ParseIP(xri[0]) != nil {
			return xri[0]
		}
	}

	return clientIP
}

// LookupIPInfo fetches geolocation information for an IP address
// Uses the free ip-api.com service (rate limited to 45 requests per minute)
func LookupIPInfo(ip string) (*IPInfo, error) {
	// Don't lookup private/local IPs
	if IsPrivateIP(ip) {
		return &IPInfo{
			IP:      ip,
			City:    "Local",
			Country: "Local Network",
		}, nil
	}

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,countryCode,region,city,timezone,isp,lat,lon,query", ip)
	resp, err := client.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to lookup IP: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Status      string  `json:"status"`
		Message     string  `json:"message"`
		Country     string  `json:"country"`
		CountryCode string  `json:"countryCode"`
		Region      string  `json:"region"`
		City        string  `json:"city"`
		Timezone    string  `json:"timezone"`
		ISP         string  `json:"isp"`
		Lat         float64 `json:"lat"`
		Lon         float64 `json:"lon"`
		Query       string  `json:"query"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to decode IP lookup response: %w", err)
	}

	if result.Status != "success" {
		return nil, fmt.Errorf("IP lookup failed: %s", result.Message)
	}

	return &IPInfo{
		IP:          result.Query,
		City:        result.City,
		Region:      result.Region,
		Country:     result.Country,
		CountryCode: result.CountryCode,
		Timezone:    result.Timezone,
		ISP:         result.ISP,
		Latitude:    result.Lat,
		Longitude:   result.Lon,
	}, nil
}

// IsPrivateIP checks if an IP address is private/local
func IsPrivateIP(ip string) bool {
	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return false
	}

	// Check if loopback
	if parsedIP.IsLoopback() {
		return true
	}

	// Check if private
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"fc00::/7",
	}

	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(parsedIP) {
			return true
		}
	}

	return false
}
