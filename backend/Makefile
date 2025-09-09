venv:
	python3 -m venv venv
	./venv/bin/python -m pip install --upgrade pip
	./venv/bin/python -m pip install -r requirements.txt

run:
	source venv/bin/activate && uvicorn main:app --reload

docker-build:
	docker build -t mini-ufo4-backend .

docker-run:
	# Monta los proyectos para persistir en el host
	docker run --rm -d --name mini-ufo4-backend -p 8000:8000 --env-file ./.env \
		-v "$(pwd)/generated_projects:/home/appuser/app/generated_projects" \
		--memory="512m" --cpus="1.0" mini-ufo4-backend

test-ws:
	./venv/bin/python test_ws_client.py

test:
	./venv/bin/python -m pytest

.PHONY: venv run docker-build docker-run test-ws test
