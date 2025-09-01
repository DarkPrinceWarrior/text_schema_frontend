#!/bin/sh

# Экспортируем переменные для использования в конфигурации nginx
export API_URL

# Подставляем переменные в конфигурацию nginx
envsubst '${API_URL}' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp
mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf

echo "API URL set to: '$API_URL'"

exec "$@"
