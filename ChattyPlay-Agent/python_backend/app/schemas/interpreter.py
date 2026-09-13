# -*- coding: utf-8 -*-
from pydantic import BaseModel


class InterpreterMessage(BaseModel):
    message: str
    