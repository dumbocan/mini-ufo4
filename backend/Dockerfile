# Usa Debian slim con 3.11 (versión recomendada)
FROM python:3.11-slim

# Variables de entorno para Python
ENV PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Dependencias del sistema que suelen pedir los extras
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl && \
    rm -rf /var/lib/apt/lists/*

# Crear un usuario no-root para seguridad y evitar problemas de permisos
RUN useradd -ms /bin/bash appuser
USER appuser
WORKDIR /home/appuser/app

# Virtualenv aislado para evitar PEP 668 y conflictos con el pip del sistema
RUN python -m venv .venv
ENV PATH="/home/appuser/app/.venv/bin:$PATH"

# Configuración del terminal para open-interpreter
ENV COLUMNS=120 LINES=40 TERM=xterm-256color PYTHONUNBUFFERED=1

# Copiar solo el fichero de requisitos primero para aprovechar el cache de Docker
COPY --chown=appuser:appuser requirements.txt .

# Instalar dependencias dentro del venv
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copiar el resto de la aplicación
COPY --chown=appuser:appuser . .

# Exponer el puerto
EXPOSE 8000

# El CMD final para ejecutar nuestra app con uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]