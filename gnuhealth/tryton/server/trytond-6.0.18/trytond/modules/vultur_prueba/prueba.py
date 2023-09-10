#! /usr/bin/env python
""" prueba.py
This file contains models. 
""" 
from trytond.model import ModelSQL, ModelView, fields


class Prueba(ModelSQL, ModelView):
    "Prueba"
    __name__ = "prueba.prueba"
    nombre = fields.Char("Nombre")
