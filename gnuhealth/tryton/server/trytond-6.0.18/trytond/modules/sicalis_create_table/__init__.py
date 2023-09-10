from trytond.pool import Pool
from . import create_table_controller

def register():
    Pool.register(
        create_table_controller.MedicalSpecialty,
        create_table_controller.Party,
        module='sicalis_create_table', type_='model')
