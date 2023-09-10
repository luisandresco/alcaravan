from trytond.model import ModelSQL, ModelView, fields
from trytond.pool import PoolMeta

class Party(metaclass=PoolMeta):
    __name__ = 'party.party'
    token = fields.Char('Token')
    partyEmail = fields.Char('partyEmail')

class MedicalSpecialty(metaclass=PoolMeta):
    __name__ = 'gnuhealth.specialty'
    nameSpanish = fields.Char('spanish')

