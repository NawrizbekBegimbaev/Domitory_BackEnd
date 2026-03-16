from django.core.validators import RegexValidator

phone_validator = RegexValidator(
    regex=r'^\+?\d{10,15}$',
    message='Enter a valid phone number (10-15 digits, optional + prefix).',
)
