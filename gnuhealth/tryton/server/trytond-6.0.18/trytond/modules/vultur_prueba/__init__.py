from trytond.pool import Pool
from .prueba import Prueba


def register():
    # pass
    Pool.register(Prueba,
                  module='vultur_prueba',
                  type_='model')
