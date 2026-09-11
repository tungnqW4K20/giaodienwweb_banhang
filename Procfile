web: gunicorn --chdir backend core.wsgi:application --bind 0.0.0.0:$PORT --workers 4 --threads 2
worker: celery -A core --workdir backend worker -l info --concurrency 2
