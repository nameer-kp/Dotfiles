killall -q polybar
while pgrep -u $UID -x polybar >/dev/null;do sleep 1;done
echo "---" |tee -a /tmp/polybar1.log
MONITOR=$(polybar -m|tail -l|sed -e 's/:.*$//g') 
polybar bar -r &
echo "bars launched"
