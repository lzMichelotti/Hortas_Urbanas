

###Sem CORS configurado em `main.py`
Se houver um frontend (React, Vue, etc.) consumindo esta API em outro domínio ou porta, todas as requisições vão falhar com erro de CORS.

**O que fazer:**
```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Ajustar para o domínio do front
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

