from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_data = response.data

        if isinstance(error_data, list):
            message = error_data[0] if error_data else str(exc)
            details = {}
        elif isinstance(error_data, dict):
            message = error_data.get('detail', str(exc))
            details = {k: v for k, v in error_data.items() if k != 'detail'}
        else:
            message = str(error_data)
            details = {}

        response.data = {
            'error': {
                'code': exc.__class__.__name__,
                'message': message,
                'details': details,
            }
        }

    return response
