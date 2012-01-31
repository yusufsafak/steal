//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
// 0.0.1
// Alexey Potehin http://www.gnuplanet.ru/doc/cv
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
#include <string>
#include <stdlib.h>
#include <v8.h>
#include <node.h>
#include <node_buffer.h>
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
bool is_uint(const char* str)
{
    size_t i = 0;

    for(;; i++, str++)
    {
	char ch = *str;

	if (ch == 0)
	{
	    break;
	}

	if
	(
	    (ch < '0') ||
	    (ch > '9')
	)
	{
	    return false;
	}
    }

    if (i == 0)
    {
	return false;
    }

    return true;
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
bool is_uint(const std::string& str)
{
    return is_uint(str.c_str());
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
bool str2uint(const char* str, unsigned int& value, unsigned int default_value)
{
    value = default_value;

    if (is_uint(str) == false)
    {
	return false;
    }

    value = atoll(str);

    return true;
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
bool str2uint(const std::string& str, unsigned int& value, unsigned int default_value)
{
    return str2uint(str.c_str(), value, default_value);
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
static v8::Handle<v8::Value>
VException(const char *msg)
{
    v8::HandleScope scope;
    return ThrowException(v8::Exception::Error(v8::String::New(msg)));
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
v8::Handle<v8::Value>
sleep_sleep_binding(const v8::Arguments &args)
{
    v8::HandleScope scope;


    if (args.Length() != 1)
    {
        return VException("One argument required - sleep time in seconds");
    }


    v8::String::AsciiValue b64data(args[0]->ToString());
    std::string seq_str = std::string(*b64data, b64data.length());

    unsigned int seq;
    if (str2uint(seq_str, seq, 0) == false)
    {
        return VException("Invalid argument - not unsigned integer");
    }


    sleep(seq);


    v8::Local<v8::String> ret = v8::String::New(seq_str.c_str());
    return scope.Close(ret);
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
extern "C" void init (v8::Handle<v8::Object> target)
{
    v8::HandleScope scope;
    target->Set(v8::String::New("sleep"), v8::FunctionTemplate::New(sleep_sleep_binding)->GetFunction());
}
//------------------------------------------------------------------------------------------------------------------------------------------------------------------------//
