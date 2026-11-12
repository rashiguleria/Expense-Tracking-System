import sys
import urllib.request

base = 'http://127.0.0.1:5000'
endpoints = [
    '/api/users',
    '/api/dashboard',
    '/api/user-expenses',
    '/api/user/1/summary',
    '/api/user/1/yearly',
    '/api/user/1/month/7',
    '/api/user/1/merchant',
    '/api/user/1/favorite-category',
    '/api/user/1/payment-mode',
    '/api/user/1/budget-status',
    '/api/user/1/insights',
]

for attempt in range(3):
    for endpoint in endpoints:
        try:
            with urllib.request.urlopen(base + endpoint, timeout=10) as response:
                body = response.read().decode('utf-8')
                print(f'{attempt + 1} {endpoint} {response.status}')
        except Exception as exc:
            print(f'{attempt + 1} {endpoint} ERROR {exc}')
            sys.exit(1)
